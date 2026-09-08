import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { getErrorCode, getErrorMessage } from "./errors";

interface PaymentIntentData {
  storeId: string;
  items: unknown[];
  shipping: Record<string, unknown>;
  customerNote?: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  storeName: string;
  expectedAmountPesewas: number;
  status: "pending" | "consumed";
}

interface VerifiedPaystackCharge {
  reference: string;
  status: string;
  amount: number; // pesewas/kobo
  // The `subaccount` param (single-subaccount split, what checkout uses)
  // reports the vendor's real net share under fees_split.subaccount, in
  // pesewas — NOT under `split` (that shape is for the separate
  // Multi-split/Transaction Splits feature with split_code, which we don't
  // use, and which is always {} for a plain subaccount charge).
  fees_split?: {
    subaccount?: number;
  };
}

// Idempotent: safe to call once from the webhook and once from
// confirmOrderPayment for the same reference — whichever gets here first
// creates the order, the other is a no-op (Firestore .create() rejects an
// existing doc, which we treat as success, not an error).
export const createOrderFromVerifiedPayment = async (
  charge: VerifiedPaystackCharge
): Promise<{ created: boolean; storeId?: string }> => {
  const db = admin.firestore();

  if (charge.status !== "success") {
    logger.warn(
      `Payment ${charge.reference} not successful (${charge.status}), skipping order creation`
    );
    return { created: false };
  }

  const intentRef = db.collection("payment_intents").doc(charge.reference);
  const intentSnap = await intentRef.get();
  if (!intentSnap.exists) {
    logger.error(`No payment_intents doc for reference ${charge.reference}`);
    return { created: false };
  }
  const intent = intentSnap.data() as PaymentIntentData;

  if (charge.amount !== intent.expectedAmountPesewas) {
    logger.error(
      `Amount mismatch for ${charge.reference}: paid ${charge.amount}, expected ${intent.expectedAmountPesewas}`
    );
    return { created: false };
  }

  const orderRef = db
    .collection("stores")
    .doc(intent.storeId)
    .collection("orders")
    .doc(charge.reference);

  const vendorNetAmount =
    charge.fees_split?.subaccount !== undefined
      ? charge.fees_split.subaccount / 100
      : undefined;

  try {
    await orderRef.create({
      items: intent.items,
      shipping: intent.shipping,
      total: charge.amount / 100,
      status: "paid",
      paymentRef: charge.reference,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: intent.userId,
      customerEmail: intent.customerEmail,
      customerName: intent.customerName,
      customerNote: intent.customerNote || "",
      storeId: intent.storeId,
      storeName: intent.storeName,
      ...(vendorNetAmount !== undefined ? { vendorNetAmount } : {}),
    });
  } catch (err) {
    // ALREADY_EXISTS (gRPC code 6) — webhook and confirmOrderPayment raced;
    // whichever got here first wins. Expected, not an error.
    if (getErrorCode(err) === 6 || getErrorMessage(err).includes("ALREADY_EXISTS")) {
      logger.info(
        `Order ${charge.reference} already created, idempotent no-op`
      );
      return { created: false, storeId: intent.storeId };
    }
    throw err;
  }

  await intentRef.update({ status: "consumed" });

  return { created: true, storeId: intent.storeId };
};
