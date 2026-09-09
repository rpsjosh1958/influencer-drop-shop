import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { Expo } from "expo-server-sdk";

// Extracted from index.ts so webhooks.ts (and any other module) can send
// notifications without a circular import back into index.ts.
export async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  type: string,
  data: Record<string, unknown>
) {
  try {
    // 1. Save to Firestore
    await admin.firestore().collection("notifications").add({
      userId,
      title,
      message: body,
      type,
      data,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 2. Send Push
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const user = userDoc.data();
    if (
      !user ||
      !user.expoPushToken ||
      !Expo.isExpoPushToken(user.expoPushToken)
    )
      return;

    const messages = [
      {
        to: user.expoPushToken,
        sound: "default",
        title,
        body,
        data: { ...data, type }, // Ensure type is in data for routing
      },
    ];

    const expoClient = new Expo();
    await expoClient.sendPushNotificationsAsync(messages);
  } catch (error) {
    logger.error(`Failed to send notification to ${userId}`, error);
  }
}
