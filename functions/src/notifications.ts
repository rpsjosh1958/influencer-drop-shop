import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

// Extracted from index.ts so webhooks.ts (and any other module) can send
// notifications without a circular import back into index.ts.
//
// This only writes the Firestore doc — it does NOT send the push itself.
// The `onNotificationCreated` trigger (index.ts) fires off this same write
// and is the single place that actually sends the Expo push, for both
// this function's callers AND the several places across the app that
// write directly to the `notifications` collection from the client
// (booking flows in particular, which have no server-side push call of
// their own and rely entirely on that trigger). This function used to
// ALSO send the push itself here, which meant every notification sent
// through it was double-pushed — one push from here, one from the
// trigger, both with identical content.
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, unknown>
) {
  try {
    await admin.firestore().collection("notifications").add({
      userId,
      title,
      message: body,
      type,
      data,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    logger.error(`Failed to save notification for ${userId}`, error);
  }
}

const NOTIFICATION_RETENTION_DAYS = 90;
const CLEANUP_BATCH_SIZE = 400;
// Caps one run at 20k deletes; anything left is picked up the next day.
const CLEANUP_MAX_BATCHES = 50;

/**
 * Deletes notifications older than NOTIFICATION_RETENTION_DAYS. Nothing else
 * ever removed them, and the apps only show the latest 50 per user, so old
 * ones just piled up.
 */
export const cleanupOldNotifications = onSchedule(
  { schedule: "every day 03:00", timeZone: "Africa/Accra" },
  async () => {
    const db = admin.firestore();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    let deleted = 0;
    for (let i = 0; i < CLEANUP_MAX_BATCHES; i++) {
      const snap = await db
        .collection("notifications")
        .where("createdAt", "<", cutoff)
        .limit(CLEANUP_BATCH_SIZE)
        .get();
      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      deleted += snap.size;
      if (snap.size < CLEANUP_BATCH_SIZE) break;
    }

    logger.info(`cleanupOldNotifications: deleted ${deleted} notification(s)`);
  }
);
