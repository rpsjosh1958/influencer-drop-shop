import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import { createRefund } from "./paystack";

interface OrderRefundData {
  total?: number;
  vendorNetAmount?: number;
  refundedAmount?: number;
  paymentMethod?: string;
  status?: string;
}

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
export const applyProcessedRefund = async (
  orderRef: FirebaseFirestore.DocumentReference,
  order: OrderRefundData,
  refundedAmountGHS: number
): Promise<void> => {
  const db = admin.firestore();
  const total = order.total || 0;
  const newRefundedTotal = (order.refundedAmount || 0) + refundedAmountGHS;
  const newStatus = newRefundedTotal >= total - 0.005 ? "refunded" : "partially_refunded";

  await orderRef.update({
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

  const storeId = orderRef.parent.parent!.id;
  const walletRef = db
    .collection("stores")
    .doc(storeId)
    .collection("wallet")
    .doc("main");
  const txRef = db
    .collection("stores")
    .doc(storeId)
    .collection("wallet_transactions")
    .doc();

  await db.runTransaction(async (t) => {
    const walletDoc = await t.get(walletRef);
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
  });
};
