import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Vendor-set checkout codes: stores/{storeId}/discount_codes/{CODE}, written
// by the store owner from the web admin (firestore.rules). The customer only
// ever sees what this file computes — initializeOrderPayment applies it to
// the server-computed subtotal, so the Paystack split (and so the platform
// fee) runs on the discounted amount: the vendor funds the discount.

export interface DiscountCodeDoc {
  type: "percent" | "fixed";
  value: number;
  active?: boolean;
  minOrder?: number | null;
  maxUses?: number | null;
  usedCount?: number;
  expiresAt?: admin.firestore.Timestamp | null;
}

// Paystack can't charge zero, so a discount always leaves at least this.
const MIN_CHARGE_GHS = 1;

export const normalizeDiscountCode = (raw: unknown) =>
  typeof raw === "string" ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";

export const discountAmount = (
  type: DiscountCodeDoc["type"],
  value: number,
  subtotal: number
) => {
  const raw =
    type === "percent" ? (subtotal * Math.min(value, 100)) / 100 : value;
  const capped = Math.min(raw, subtotal - MIN_CHARGE_GHS);
  return Math.max(0, Math.round(capped * 100) / 100);
};

// Throws a customer-facing HttpsError when the code can't be used. The
// maxUses check reads usedCount, which only goes up once an order is really
// created (orders.ts). ponytail: two checkouts racing for the last use can
// both get it — reserve a use at initialize (like stock) if that matters.
export const computeDiscount = async (
  storeId: string,
  rawCode: unknown,
  subtotal: number
) => {
  const code = normalizeDiscountCode(rawCode);
  const snap = code
    ? await admin
        .firestore()
        .collection("stores")
        .doc(storeId)
        .collection("discount_codes")
        .doc(code)
        .get()
    : null;
  const d = snap?.data() as DiscountCodeDoc | undefined;

  if (
    !d ||
    d.active === false ||
    (d.type !== "percent" && d.type !== "fixed") ||
    !(d.value > 0)
  ) {
    throw new HttpsError("not-found", "That discount code isn't valid");
  }
  if (d.expiresAt && d.expiresAt.toMillis() < Date.now()) {
    throw new HttpsError("failed-precondition", "That discount code has expired");
  }
  if (d.maxUses && (d.usedCount || 0) >= d.maxUses) {
    throw new HttpsError("failed-precondition", "That discount code has been fully used");
  }
  if (d.minOrder && subtotal < d.minOrder) {
    throw new HttpsError(
      "failed-precondition",
      `That code needs an order of at least GHS ${d.minOrder}`
    );
  }

  return { code, amount: discountAmount(d.type, d.value, subtotal) };
};

// Checkout's "Apply" button — display only. The subtotal comes from the
// client, so this can't be trusted for money; initializeOrderPayment
// re-runs computeDiscount against the real server-side subtotal.
export const previewDiscount = onCall(async (request) => {
  const { storeId, code, subtotal } = request.data || {};
  if (typeof storeId !== "string" || !storeId || !(subtotal > 0)) {
    throw new HttpsError("invalid-argument", "Missing store or subtotal");
  }
  return computeDiscount(storeId, code, subtotal);
});
