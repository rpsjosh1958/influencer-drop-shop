import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

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
