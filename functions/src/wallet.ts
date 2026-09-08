import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
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
  reference?: string;
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
    // money never touches our main balance, so it is recorded here purely
    // for the vendor's earnings history, not as a spendable balance
    // (currentBalance/pendingBalance only back the legacy internal-ledger
    // path below, from before subaccounts existed).
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
    // internal-ledger balance (currentBalance/pendingBalance).
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
