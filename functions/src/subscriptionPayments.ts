import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { BILLING_PLANS } from "./billing";

interface SubscriptionIntentData {
  userId: string;
  billingCycle: string;
  expectedAmountPesewas: number;
  status: "pending" | "consumed";
}

interface VerifiedCharge {
  reference: string;
  status: string;
  amount: number; // pesewas
}

// Idempotent, same pattern as orders.ts's createOrderFromVerifiedPayment:
// safe to call once from the webhook and once from confirmSubscriptionPayment
// for the same reference.
export const applySubscriptionPaymentIfVerified = async (
  charge: VerifiedCharge
): Promise<{ applied: boolean; alreadyConsumed?: boolean }> => {
  const db = admin.firestore();

  if (charge.status !== "success") {
    logger.warn(
      `Subscription payment ${charge.reference} not successful (${charge.status})`
    );
    return { applied: false };
  }

  const intentRef = db.collection("subscription_intents").doc(charge.reference);

  return db.runTransaction(async (t) => {
    const intentSnap = await t.get(intentRef);
    if (!intentSnap.exists) {
      logger.error(`No subscription_intents doc for reference ${charge.reference}`);
      return { applied: false };
    }
    const intent = intentSnap.data() as SubscriptionIntentData;

    if (intent.status === "consumed") {
      // Already applied by the webhook/confirm racing — safe no-op, not a
      // failure.
      return { applied: false, alreadyConsumed: true };
    }

    if (charge.amount !== intent.expectedAmountPesewas) {
      logger.error(
        `Amount mismatch for subscription ${charge.reference}: paid ${charge.amount}, expected ${intent.expectedAmountPesewas}`
      );
      return { applied: false };
    }

    const plan = BILLING_PLANS[intent.billingCycle];
    if (!plan) {
      logger.error(`Unknown billing cycle on intent ${charge.reference}: ${intent.billingCycle}`);
      return { applied: false };
    }

    const now = admin.firestore.Timestamp.now();
    const expiresAt = new admin.firestore.Timestamp(
      now.seconds + plan.days * 24 * 60 * 60,
      now.nanoseconds
    );

    const userRef = db.collection("users").doc(intent.userId);
    t.update(userRef, {
      plan: "growth",
      isTrial: false,
      hasUsedTrial: true,
      planStartedAt: now,
      planExpiresAt: expiresAt,
      billingCycle: intent.billingCycle,
    });
    t.update(intentRef, { status: "consumed" });

    return { applied: true };
  });
};