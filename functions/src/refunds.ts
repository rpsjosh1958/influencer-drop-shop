import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { createRefund } from "./paystack";
import { syncRecoveryRate } from "./wallet";

interface OrderRefundData {
  total?: number;
  vendorNetAmount?: number;
  refundedAmount?: number;
  pendingRefundAmount?: number;
  paymentMethod?: string;
  status?: string;
  deliveredAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  createdAt?: admin.firestore.Timestamp;
}

const REFUND_WINDOW_AFTER_DELIVERY_MS = 12 * 60 * 60 * 1000;

// Orders delivered before deliveredAt existed fall back to their last write (or creation) time.
const getDeliveredAtMs = (order: OrderRefundData): number | undefined => {
  if (order.deliveredAt) return order.deliveredAt.toMillis();
  if (order.status !== "delivered") return undefined;
  return (order.updatedAt ?? order.createdAt)?.toMillis();
};

// Looks up which store an order belongs to from a Paystack reference —
// reused by both the refund and dispute webhook handlers, neither of which
// carries our storeId directly. payment_intents/{reference} always exists
// for any order created through the real checkout flow (see orders.ts) and
// keeps storeId even after being marked "consumed".
export const findOrderRefFromReference = async (
  reference: string
): Promise<FirebaseFirestore.DocumentReference | null> => {
  const db = admin.firestore();
  const intentSnap = await db
    .collection("payment_intents")
    .doc(reference)
    .get();
  const storeId = intentSnap.data()?.storeId;
  if (!storeId) return null;
  return db
    .collection("stores")
    .doc(storeId)
    .collection("orders")
    .doc(reference);
};

// Initiates a refund with Paystack — does NOT touch the vendor's recorded
// earnings yet. A refund can still fail or land in needs-attention after
// being created (see webhooks.ts), and we don't want to have already
// clawed back money from the vendor's earnings for a refund that never
// actually completed. That adjustment only happens in applyProcessedRefund,
// once the refund.processed webhook confirms it actually went through.
export const initiateOrderRefund = async (
  orderRef: FirebaseFirestore.DocumentReference,
  order: OrderRefundData,
  amountGHS: number | undefined,
  merchantNote: string | undefined
): Promise<{ status: string; amount: number }> => {
  if (order.paymentMethod === "manual") {
    throw new HttpsError(
      "failed-precondition",
      "This order was recorded manually and has no real Paystack transaction to refund."
    );
  }
  if (typeof order.total !== "number") {
    throw new HttpsError("failed-precondition", "Order has no total amount.");
  }
  // One refund in flight per order: the completion webhook is matched to
  // the order via pendingRefundAmount, so a second refund started now would
  // overwrite it and never be taken back from the vendor. Cleared when the
  // refund completes or fails (webhooks.ts).
  if (order.pendingRefundAmount !== undefined) {
    throw new HttpsError(
      "failed-precondition",
      "A refund for this order is still processing. Wait for it to finish before starting another."
    );
  }

  // The order's doc ID is sent to Paystack as the transaction to refund, so
  // it must be a paid checkout of THIS store. Without this, a vendor could
  // create an order doc named after any reference (their own Growth
  // payment, a purchase at another store) and refund it from the
  // platform's balance. payment_intents is server-only and becomes
  // "consumed" only once a verified payment has created the order.
  const intent = (
    await admin.firestore().collection("payment_intents").doc(orderRef.id).get()
  ).data();
  if (
    intent?.storeId !== orderRef.parent.parent?.id ||
    intent?.status !== "consumed"
  ) {
    throw new HttpsError(
      "failed-precondition",
      "This order has no verified checkout payment to refund. Contact support if you think this is wrong."
    );
  }

  const deliveredAtMs = getDeliveredAtMs(order);
  if (
    deliveredAtMs !== undefined &&
    Date.now() - deliveredAtMs > REFUND_WINDOW_AFTER_DELIVERY_MS
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Refunds are only available for 12 hours after an order is marked delivered."
    );
  }

  const alreadyRefunded = order.refundedAmount || 0;
  const refundable = order.total - alreadyRefunded;
  if (refundable <= 0.005) {
    throw new HttpsError(
      "failed-precondition",
      "This order has already been fully refunded."
    );
  }

  const amount = amountGHS ?? refundable;
  if (amount <= 0 || amount > refundable + 0.005) {
    throw new HttpsError(
      "invalid-argument",
      `Refund amount must be between 0 and ${refundable.toFixed(2)}.`
    );
  }

  // Only omit `amount` (letting Paystack treat it as a full refund of the
  // ORIGINAL transaction) when nothing has been refunded yet and this
  // covers the whole thing — otherwise always pass it explicitly, since we
  // (not Paystack) are the ones enforcing the cumulative refunded-amount
  // cap across multiple partial refunds.
  const isFullOriginalAmount = alreadyRefunded === 0 && amount >= refundable - 0.005;

  const refund = await createRefund({
    transaction: orderRef.id, // doc ID is the Paystack reference
    ...(isFullOriginalAmount ? {} : { amount: Math.round(amount * 100) }),
    ...(merchantNote ? { merchant_note: merchantNote } : {}),
  });

  await orderRef.update({
    refundStatus: refund?.status || "pending",
    pendingRefundAmount: amount,
    pendingRefundReference: refund?.id ?? null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: refund?.status || "pending", amount };
};

// Called from the refund.processed webhook once Paystack confirms the
// refund actually completed. Debits the vendor's recorded earnings —
// proportional to the split ratio the order was originally credited at,
// so a partial refund only claws back the vendor's real share of it, not
// the platform's fee cut too. Only ever touches totalEarned, mirroring
// processOrderWallet's subaccount_split credit (which never touches
// currentBalance/pendingBalance either, since that money settles straight
// to the vendor's own bank/MoMo, never held in-app). Reconciling
// currentBalance/pendingBalance for a pre-migration internal-ledger order
// is intentionally out of scope here — that whole legacy balance system
// was already deliberately deprioritized elsewhere in this codebase.
// Returns false if this refund was already applied (Paystack redelivers
// webhooks) — the check, the order update, the earnings debit and the debt
// change are one transaction, so a redelivery racing the first can't debit
// twice and two refunds/orders can't overwrite each other's debt.
export const applyProcessedRefund = async (
  orderRef: FirebaseFirestore.DocumentReference,
  refundedAmountGHS: number
): Promise<boolean> => {
  const db = admin.firestore();
  const storeRef = orderRef.parent.parent!;
  const walletRef = storeRef.collection("wallet").doc("main");
  const txRef = storeRef.collection("wallet_transactions").doc();

  const result = await db.runTransaction(async (t) => {
    const [orderSnap, walletDoc, storeSnap] = await Promise.all([
      t.get(orderRef),
      t.get(walletRef),
      t.get(storeRef),
    ]);
    const order = orderSnap.data() as OrderRefundData | undefined;
    // Cleared below once applied, so its absence means this exact refund
    // was already handled.
    if (!order || order.pendingRefundAmount === undefined) return null;

    const total = order.total || 0;
    const newRefundedTotal = (order.refundedAmount || 0) + refundedAmountGHS;
    const newStatus = newRefundedTotal >= total - 0.005 ? "refunded" : "partially_refunded";
    t.update(orderRef, {
      status: newStatus,
      refundedAmount: newRefundedTotal,
      refundStatus: "processed",
      pendingRefundAmount: admin.firestore.FieldValue.delete(),
      pendingRefundReference: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const vendorShareRatio =
      typeof order.vendorNetAmount === "number" && total > 0
        ? order.vendorNetAmount / total
        : 1; // legacy orders (no vendorNetAmount) already stored the net amount as the credit — treat 1:1
    const vendorDebit = refundedAmountGHS * vendorShareRatio;
    const currentBalance = walletDoc.exists
      ? walletDoc.data()?.currentBalance || 0
      : 0;
    const totalEarned = Math.max(
      0,
      (walletDoc.exists ? walletDoc.data()?.totalEarned || 0 : 0) - vendorDebit
    );
    t.set(
      walletRef,
      { totalEarned, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    t.set(txRef, {
      id: txRef.id,
      type: "debit",
      amount: vendorDebit,
      description: `Refund on Order #${orderRef.id.slice(0, 8).toUpperCase()}`,
      orderId: orderRef.id,
      status: "success",
      createdAt: admin.firestore.Timestamp.now(),
      balanceAfter: currentBalance,
      source:
        typeof order.vendorNetAmount === "number"
          ? "subaccount_split"
          : "internal_ledger",
    });

    // Refund-debt recovery — only meaningful for real subaccount-split
    // orders (legacy internal-ledger orders have no live Paystack
    // subaccount money flow to recover from this way). Paystack pulled this
    // refund out of the platform's own main balance, not the vendor's
    // subaccount, so `vendorDebit` above is a bookkeeping adjustment only —
    // this is what actually goes after getting real money back, by taking
    // a bigger share of the vendor's future order splits until it's repaid.
    if (typeof order.vendorNetAmount !== "number") return { debt: null };
    const store = storeSnap.data();
    const priorDebt = store?.pendingRefundDebt || 0;
    const newDebt = priorDebt + vendorDebit;
    t.update(storeRef, { pendingRefundDebt: newDebt });
    return { debt: { priorDebt, newDebt, store } };
  });

  if (!result) return false;
  if (result.debt) {
    await syncRecoveryRate(
      result.debt.store?.payoutConfig?.subaccountCode,
      result.debt.store?.plan,
      result.debt.priorDebt,
      result.debt.newDebt
    );
  }
  return true;
};
