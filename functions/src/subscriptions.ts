import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

/**
 * Scheduled Job: Check for Expired Subscriptions
 * Frequency: Every 24 hours
 * Action: Downgrades expired "growth" plans to "starter" and removes verification.
 */
export const checkSubscriptionExpiry = onSchedule(
  "every 24 hours",
  async (event) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // Query for Active Growth Stores where planExpiresAt < now
      const expiredStoresSnapshot = await db
        .collection("stores")
        .where("plan", "==", "growth")
        .where("planExpiresAt", "<", now)
        .get();

      if (expiredStoresSnapshot.empty) {
        logger.info("No expired subscriptions found.");
        return;
      }

      const batch = db.batch();
      let count = 0;

      expiredStoresSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          plan: "starter",
          isVerified: false, // Remove verification on downgrade
          planExpiredAt: now, // Record when we actually downgraded
        });
        count++;
      });

      await batch.commit();
      logger.info(`Downgraded ${count} stores to starter plan.`);
    } catch (error) {
      logger.error("Error checking subscription expiry", error);
    }
  }
);
