import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {
  getPlatformFeeRate,
  getPlatformFeePercentage,
  REFUND_DEBT_RECOVERY_PERCENTAGE,
} from "./fees";
import { updateSubaccount } from "./paystack";

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

interface OrderWalletData {
  paymentMethod?: string;
  status?: string;
  vendorNetAmount?: number;
  paystackFee?: number;
  total?: number;
}

// Keeps a store's Paystack split rate in step with its refund debt after a
// change from `prior` to `next` (positive = vendor owes the platform,
// negative = platform owes the vendor): settled -> the plan's normal rate;
// newly owing the vendor -> 0%; newly owed by the vendor -> the elevated
// recovery rate. Staying in the same regime needs no API call.
export const recoveryRateFor = (
  plan: string | undefined,
  prior: number,
  next: number
): number | undefined => {
  if (Math.abs(next) <= 0.005) {
    return Math.abs(prior) > 0.005 ? getPlatformFeePercentage(plan) : undefined;
  }
  if (next < 0 && prior >= 0) return 0;
  if (next > 0 && prior <= 0) return REFUND_DEBT_RECOVERY_PERCENTAGE;
  return undefined;
};

// What the vendor's split would be at their plan's normal rate. They bear
// Paystack's fee, so it comes off too — otherwise every order's fee would
// look like refund debt being repaid.
export const fairVendorNet = (total: number, plan: string | undefined, paystackFee = 0) =>
  total * (1 - getPlatformFeeRate(plan)) - paystackFee;

export const syncRecoveryRate = async (
  subaccountCode: string | undefined,
  plan: string | undefined,
  prior: number,
  next: number
) => {
  if (!subaccountCode) return;
  const percentage_charge = recoveryRateFor(plan, prior, next);
  if (percentage_charge === undefined) return;
  try {
    await updateSubaccount(subaccountCode, { percentage_charge });
  } catch (err) {
    // Not fatal — the debt is recorded and is recovered at whatever rate is
    // actually active; recovery just starts slower than intended.
    console.error(`Failed to sync subaccount rate (${subaccountCode}) for refund debt`, err);
  }
};

export const processOrderWallet = async (
  orderId: string,
  orderData: OrderWalletData,
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
      const vendorNetAmount = orderData.vendorNetAmount;
      const storeRef = db.collection("stores").doc(storeId);
      const walletRef = storeRef.collection("wallet").doc("main");
      // Keyed by order, so a re-delivered trigger (Firestore triggers are
      // at-least-once) finds it and records nothing twice.
      const txRef = storeRef.collection("wallet_transactions").doc(`order_${orderId}`);
      const adjustmentTxRef = storeRef
        .collection("wallet_transactions")
        .doc(`order_${orderId}_debt`);

      // Refund-debt recovery — pendingRefundDebt is signed: positive means
      // the vendor still owes the platform (subaccount is running at the
      // elevated REFUND_DEBT_RECOVERY_PERCENTAGE rate, so vendorNetAmount
      // here is smaller than their fair share); negative means the
      // PLATFORM owes the vendor (the order that finally cleared a past
      // debt took slightly more than was actually owed — Paystack's split
      // rate is fixed on the subaccount ahead of time, not adjustable per
      // transaction, so there's no way to take *exactly* the remaining
      // debt and not a cent more — so the subaccount rate gets dropped
      // below normal afterward to pay that overage back on the next order
      // instead of just absorbing it as platform revenue).
      // One transaction for the earnings, the debt and the idempotency
      // check: reading the debt outside it and writing back an absolute
      // value let two orders landing together overwrite each other.
      const result = await db.runTransaction(async (t) => {
        const [txDoc, walletDoc, storeSnap] = await Promise.all([
          t.get(txRef),
          t.get(walletRef),
          t.get(storeRef),
        ]);
        if (txDoc.exists) return null; // already recorded

        const store = storeSnap.data();
        const pendingRefundDebt = store?.pendingRefundDebt || 0;
        let creditAmount = vendorNetAmount;
        let shortfall = 0; // positive = vendor got less than fair this order; negative = vendor got more than fair

        if (pendingRefundDebt !== 0 && typeof orderData.total === "number") {
          const normalNet = fairVendorNet(
            orderData.total,
            store?.plan,
            orderData.paystackFee
          );
          shortfall = normalNet - vendorNetAmount;
          // Recovering debt (shortfall > 0): still credit the FAIR amount to
          // earnings history — what went toward the debt isn't "lost," it's
          // legitimately owed. Repaying an overshoot (shortfall < 0): credit
          // the full real vendorNetAmount, which is genuinely higher than
          // normalNet this order (fair share + the make-whole top-up).
          creditAmount = shortfall > 0.005 ? normalNet : vendorNetAmount;
        }
        const hasAdjustment = Math.abs(shortfall) > 0.005;
        const newDebt = pendingRefundDebt - shortfall;

        const currentBalance = walletDoc.exists
          ? walletDoc.data()?.currentBalance || 0
          : 0;
        const totalEarned =
          (walletDoc.exists ? walletDoc.data()?.totalEarned || 0 : 0) +
          creditAmount;
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
          amount: creditAmount,
          description: `Earnings from Order #${orderId
            .slice(0, 8)}`,
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

        if (hasAdjustment) {
          t.update(storeRef, { pendingRefundDebt: newDebt });
          const isRecovery = shortfall > 0;
          t.set(adjustmentTxRef, {
            id: adjustmentTxRef.id,
            type: isRecovery ? "debit" : "credit",
            amount: Math.abs(shortfall),
            description: isRecovery
              ? `Refund debt recovery — Order #${orderId.slice(0, 8).toUpperCase()}`
              : `Refund overpayment correction — Order #${orderId.slice(0, 8).toUpperCase()}`,
            orderId: orderId,
            status: "success",
            createdAt: admin.firestore.Timestamp.now(),
            balanceAfter: currentBalance,
            source: "subaccount_split",
          });
        }
        return { hasAdjustment, shortfall, pendingRefundDebt, newDebt, store };
      });

      if (!result) {
        console.log(`Order ${orderId} earnings already recorded, skipping.`);
        return;
      }
      if (result.hasAdjustment) {
        await syncRecoveryRate(
          result.store?.payoutConfig?.subaccountCode,
          result.store?.plan,
          result.pendingRefundDebt,
          result.newDebt
        );
      }

      console.log(
        `Recorded subaccount-split earnings for Order ${orderId}: Net=${vendorNetAmount}` +
          (result.hasAdjustment
            ? `, refund debt adjustment ${result.shortfall.toFixed(2)} (${result.newDebt.toFixed(2)} remaining)`
            : "")
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

    // Keyed by order: a re-delivered trigger finds it and credits nothing twice.
    const txRef = db
      .collection("stores")
      .doc(storeId)
      .collection("wallet_transactions")
      .doc(`order_${orderId}`);

    await db.runTransaction(async (t) => {
      const [walletDoc, txDoc] = await Promise.all([t.get(walletRef), t.get(txRef)]);
      if (txDoc.exists) return;

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
