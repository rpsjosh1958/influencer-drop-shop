import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { initiateTransfer } from "./paystack";
import { HttpsError } from "firebase-functions/v2/https";
import { getPlatformFeeRate } from "./fees";

interface WalletTransaction {
  id: string;
  type: "credit" | "debit" | "payout";
  amount: number; // The amount added/subtracted
  description: string;
  orderId?: string;
  status: "success" | "pending" | "failed" | "processing";
  createdAt: admin.firestore.Timestamp;
  balanceAfter: number;
  recipientCode?: string;
  reference?: string;
  paystackTransferCode?: string;
  source?: "subaccount_split" | "internal_ledger";
}

export const processOrderWallet = async (
  orderId: string,
  orderData: any, // Typed as any for flexibility with Firestore data
  storeId: string
) => {
  // Skip wallet processing for manually added orders (cash, DM, etc)
  if (orderData.paymentMethod === "manual" || orderData.status === "manual") {
    console.log(`Order ${orderId} is manual. Skipping wallet processing.`);
    return;
  }

  const db = admin.firestore();
  try {
    // Orders created via the verified checkout path (initializeOrderPayment /
    // confirmOrderPayment / the Paystack webhook) carry the REAL net amount
    // Paystack already split to the vendor's subaccount at charge time — that
    // money never touches our main balance, so it is recorded here purely for
    // the vendor's earnings history and must NOT be added to
    // currentBalance/pendingBalance (which back the manual "Withdraw Funds"
    // flow via our own initiateTransfer). Crediting it there would let a
    // vendor be paid twice for the same order: once by Paystack's automatic
    // subaccount settlement, once again by us on withdrawal.
    if (typeof orderData.vendorNetAmount === "number") {
      const txRef = db
        .collection("stores")
        .doc(storeId)
        .collection("wallet_transactions")
        .doc();
      await db.runTransaction(async (t) => {
        const walletRef = db
          .collection("stores")
          .doc(storeId)
          .collection("wallet")
          .doc("main");
        const walletDoc = await t.get(walletRef);
        const currentBalance = walletDoc.exists
          ? walletDoc.data()?.currentBalance || 0
          : 0;
        const totalEarned =
          (walletDoc.exists ? walletDoc.data()?.totalEarned || 0 : 0) +
          orderData.vendorNetAmount;
        t.set(
          walletRef,
          {
            totalEarned,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        const txData: WalletTransaction = {
          id: txRef.id,
          type: "credit",
          amount: orderData.vendorNetAmount,
          description: `Earnings from Order #${orderId
            .slice(0, 8)
            .toUpperCase()} (auto-settled via Paystack)`,
          orderId: orderId,
          status: "success",
          createdAt: admin.firestore.Timestamp.now(),
          // Unchanged — this transaction never touches currentBalance.
          balanceAfter: currentBalance,
        };
        t.set(txRef, {
          ...txData,
          source: "subaccount_split",
        });
      });
      console.log(
        `Recorded subaccount-split earnings for Order ${orderId}: Net=${orderData.vendorNetAmount}`
      );
      return;
    }

    // Legacy path — no verified split amount on the order (pre-migration
    // orders, or any straggler not created via the new checkout flow).
    // Keeps prior behavior: compute the fee internally and credit the
    // spendable, our-balance-backed wallet the vendor withdraws via
    // initiateWithdrawal.
    // 1. Fetch Store to check Plan
    const storeDoc = await db.collection("stores").doc(storeId).get();
    if (!storeDoc.exists) {
      console.error(`Store ${storeId} not found for order ${orderId}`);
      return;
    }
    const store = storeDoc.data();
    const plan = store?.plan || "starter"; // Default to starter

    // 2. Calculate Fees
    const rate = getPlatformFeeRate(plan);
    const grossAmount = orderData.total || 0;
    const platformFee = grossAmount * rate;
    const netAmount = grossAmount - platformFee;

    // 3. Determine if Instant or Pending (T+2)
    // Growth = Instant (add to currentBalance)
    // Starter = Pending (add to pendingBalance)
    const isInstant = plan === "growth";

    // 4. Update Wallet Transactionally
    const walletRef = db
      .collection("stores")
      .doc(storeId)
      .collection("wallet")
      .doc("main");

    await db.runTransaction(async (t) => {
      const walletDoc = await t.get(walletRef);

      let currentBalance = 0;
      let pendingBalance = 0;
      let totalEarned = 0;

      if (walletDoc.exists) {
        const data = walletDoc.data();
        currentBalance = data?.currentBalance || 0;
        pendingBalance = data?.pendingBalance || 0;
        totalEarned = data?.totalEarned || 0;
      }

      // Update Balances
      if (isInstant) {
        currentBalance += netAmount;
      } else {
        pendingBalance += netAmount;
      }
      totalEarned += netAmount;

      // Write to Wallet
      t.set(
        walletRef,
        {
          currentBalance,
          pendingBalance,
          totalEarned,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Create Transaction Record
      const txRef = db
        .collection("stores")
        .doc(storeId)
        .collection("wallet_transactions")
        .doc();
      const txData: WalletTransaction = {
        id: txRef.id,
        type: "credit",
        amount: netAmount,
        description: `Earnings from Order #${orderId
          .slice(0, 8)
          .toUpperCase()}`,
        orderId: orderId,
        status: isInstant ? "success" : "pending",
        createdAt: admin.firestore.Timestamp.now(),
        balanceAfter: currentBalance,
      };

      t.set(txRef, { ...txData, source: "internal_ledger" });
    });

    console.log(
      `Processed Wallet for Order ${orderId}: Plan=${plan}, Net=${netAmount}, Instant=${isInstant}`
    );
  } catch (error) {
    console.error("Error processing wallet:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Wallet processing failed"
    );
  }
};

export const handleWithdrawal = async (storeId: string, amount: number) => {
  const db = admin.firestore();
  // 1. Validation
  if (amount < 10) {
    throw new HttpsError("invalid-argument", "Minimum withdrawal is GHS 10");
  }

  const walletRef = db
    .collection("stores")
    .doc(storeId)
    .collection("wallet")
    .doc("main");
  const storeRef = db.collection("stores").doc(storeId);

  // 2. Debit First (Optimistic Locking)
  const txData = await db.runTransaction(async (t) => {
    const walletDoc = await t.get(walletRef);
    const storeDoc = await t.get(storeRef);

    if (!walletDoc.exists || !storeDoc.exists) {
      throw new HttpsError("not-found", "Store or Wallet not found");
    }

    const walletData = walletDoc.data();
    const currentBalance = walletData?.currentBalance || 0;

    if (currentBalance < amount) {
      throw new HttpsError("failed-precondition", "Insufficient funds");
    }

    const payoutConfig = storeDoc.data()?.payoutConfig;
    if (!payoutConfig || !payoutConfig.recipientCode) {
      throw new HttpsError("failed-precondition", "No payout method linked");
    }

    // Debit
    const newBalance = currentBalance - amount;
    t.update(walletRef, {
      currentBalance: newBalance,
      totalWithdrawn: admin.firestore.FieldValue.increment(amount),
    });

    // Create "Processing" Transaction
    const txRef = db
      .collection("stores")
      .doc(storeId)
      .collection("wallet_transactions")
      .doc();
    const transactionId = txRef.id;

    t.set(txRef, {
      id: transactionId,
      type: "payout",
      amount: amount,
      description: "Withdrawal Initiation",
      status: "processing", // We mark as processing first
      createdAt: admin.firestore.Timestamp.now(),
      balanceAfter: newBalance,
      recipientCode: payoutConfig.recipientCode,
    });

    return { txId: transactionId, recipientCode: payoutConfig.recipientCode };
  });

  // 3. Call Paystack (Outside Firestore Transaction)
  try {
    const transfer = await initiateTransfer(
      amount * 100, // Convert to kobo
      txData.recipientCode,
      "Payout from CopDrop"
    );

    // 4. Stay "processing" — Paystack transfers resolve asynchronously.
    // The paystackWebhook handler (transfer.success / transfer.failed /
    // transfer.reversed) is the authority on final status; treating the
    // initial API response as final would let a transfer that later fails
    // or reverses stay marked "Successful" forever.
    await db
      .collection("stores")
      .doc(storeId)
      .collection("wallet_transactions")
      .doc(txData.txId)
      .update({
        status: "processing",
        reference: transfer.data.reference,
        paystackTransferCode: transfer.data.transfer_code,
        description: "Withdrawal submitted to Paystack, awaiting confirmation",
      });

    // Lightweight top-level lookup so the webhook (which only gets the
    // Paystack reference, not the storeId) can find this transaction
    // without a collection-group query / extra index.
    await db.collection("transfer_refs").doc(transfer.data.reference).set({
      storeId,
      transactionId: txData.txId,
      amount,
      createdAt: admin.firestore.Timestamp.now(),
    });

    return {
      success: true,
      balance: amount,
      reference: transfer.data.reference,
    };
  } catch (error: any) {
    console.error("Payout Failed, Refunding...", error);

    // 5. Refund on Failure
    await db.runTransaction(async (t) => {
      const walletDoc = await t.get(walletRef);
      const currentBalance = walletDoc.data()?.currentBalance || 0;

      t.update(walletRef, {
        currentBalance: currentBalance + amount,
        totalWithdrawn: admin.firestore.FieldValue.increment(-amount),
      });

      t.update(
        db
          .collection("stores")
          .doc(storeId)
          .collection("wallet_transactions")
          .doc(txData.txId),
        {
          status: "failed",
          description: `Withdrawal Failed: ${error.message || "Unknown error"}`,
        }
      );
    });

    throw new HttpsError(
      "internal",
      "Payout failed. Funds have been returned to your wallet."
    );
  }
};

// Called by the Paystack webhook (transfer.success / transfer.failed /
// transfer.reversed) — the async confirmation `handleWithdrawal` no longer
// assumes on the initial API response.
export const resolveTransferStatus = async (
  reference: string,
  outcome: "success" | "failed" | "reversed"
) => {
  const db = admin.firestore();
  const refDoc = await db.collection("transfer_refs").doc(reference).get();
  if (!refDoc.exists) {
    console.warn(`No transfer_refs entry for reference ${reference}`);
    return;
  }
  const { storeId, transactionId, amount } = refDoc.data() as {
    storeId: string;
    transactionId: string;
    amount: number;
  };

  const txRef = db
    .collection("stores")
    .doc(storeId)
    .collection("wallet_transactions")
    .doc(transactionId);

  const txSnap = await txRef.get();
  // Idempotency: only act if still "processing" — a replayed webhook
  // shouldn't refund the wallet twice.
  if (!txSnap.exists || txSnap.data()?.status !== "processing") {
    console.log(
      `transfer_refs ${reference}: tx already resolved or missing, skipping`
    );
    return;
  }

  if (outcome === "success") {
    await txRef.update({
      status: "success",
      description: "Withdrawal Successful",
    });
    return;
  }

  // failed or reversed — refund the wallet, same as the synchronous-failure
  // path in handleWithdrawal.
  const walletRef = db
    .collection("stores")
    .doc(storeId)
    .collection("wallet")
    .doc("main");

  await db.runTransaction(async (t) => {
    const walletDoc = await t.get(walletRef);
    const currentBalance = walletDoc.data()?.currentBalance || 0;
    t.update(walletRef, {
      currentBalance: currentBalance + amount,
      totalWithdrawn: admin.firestore.FieldValue.increment(-amount),
    });
    t.update(txRef, {
      status: "failed",
      description: `Withdrawal ${outcome} — funds returned to your wallet.`,
    });
  });
};

export const releasePendingFunds = async (storeId: string) => {
  const db = admin.firestore();
  const walletRef = db
    .collection("stores")
    .doc(storeId)
    .collection("wallet")
    .doc("main");

  await db.runTransaction(async (t) => {
    const walletDoc = await t.get(walletRef);
    if (!walletDoc.exists) return;

    const data = walletDoc.data();
    const pending = data?.pendingBalance || 0;
    const current = data?.currentBalance || 0;

    if (pending > 0) {
      t.update(walletRef, {
        currentBalance: current + pending,
        pendingBalance: 0,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log the internal transfer
      const txRef = db
        .collection("stores")
        .doc(storeId)
        .collection("wallet_transactions")
        .doc();

      t.set(txRef, {
        id: txRef.id,
        type: "credit",
        amount: pending,
        description: "Funds Released (Plan Upgrade)",
        status: "success",
        createdAt: admin.firestore.Timestamp.now(),
        balanceAfter: current + pending,
      });
    }
  });

  console.log(`Released pending funds for store ${storeId}`);
};
