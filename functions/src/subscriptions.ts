import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

/**
 * Scheduled Job: Check for Expired Subscriptions
 * Frequency: Every hour
 * Action: Downgrades expired "growth" plans to "starter" and removes verification.
 */
export const checkSubscriptionExpiry = onSchedule(
  "every 1 hours",
  async (event) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();

    try {
      // 1. Query for Users on Growth Plan where planExpiresAt < now
      const expiredUsersSnapshot = await db
        .collection("users")
        .where("plan", "==", "growth")
        .where("planExpiresAt", "<", now)
        .get();

      if (expiredUsersSnapshot.empty) {
        logger.info("No expired user subscriptions found.");
        return;
      }

      const batch = db.batch();
      let count = 0;

      expiredUsersSnapshot.forEach((doc) => {
        // Downgrade USER document. 
        // Sync trigger in index.ts will downgrade all their stores.
        batch.update(doc.ref, {
          plan: "starter",
          planExpiredAt: now, 
          isTrial: false,
        });
        count++;
      });

      await batch.commit();
      logger.info(`Downgraded ${count} users (and their stores) to starter plan.`);
    } catch (error) {
      logger.error("Error checking user subscription expiry", error);
    }
  }
);
