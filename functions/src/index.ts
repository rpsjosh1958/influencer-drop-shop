import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import { resolveAccount, createRecipient, listBanks } from "./paystack";
import { processOrderWallet, handleWithdrawal } from "./wallet";

admin.initializeApp();

const expo = new Expo();

export const onNotificationCreated = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.error("No data associated with the event");
      return;
    }

    const data = snapshot.data();
    const userId = data.userId;
    const title = data.title;
    const message = data.message;
    const orderId = data.orderId;

    if (!userId || !title || !message) {
      logger.warn("Missing required fields for notification");
      return;
    }

    if (userId === "all") {
      try {
        const usersSnapshot = await admin.firestore().collection("users").get();
        const messages: ExpoPushMessage[] = [];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (
            userData.expoPushToken &&
            Expo.isExpoPushToken(userData.expoPushToken)
          ) {
            messages.push({
              to: userData.expoPushToken,
              sound: "default",
              title: title,
              body: message,
              data: { orderId: orderId },
            });
          }
        });

        if (messages.length === 0) {
          logger.info("No users with valid tokens found for broadcast");
          return;
        }

        const chunks = expo.chunkPushNotifications(messages);
        const tickets = [];

        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
            tickets.push(...ticketChunk);
          } catch (error) {
            logger.error("Error sending push notifications chunk", error);
          }
        }
        logger.info(`Broadcast notification sent to ${messages.length} users`);
        return;
      } catch (error) {
        logger.error("Error broadcasting notification", error);
        return;
      }
    }

    try {
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();
      const user = userDoc.data();

      if (!user || !user.expoPushToken) {
        logger.info(`No Expo Push Token found for user ${userId}`);
        return;
      }

      const pushToken = user.expoPushToken;

      if (!Expo.isExpoPushToken(pushToken)) {
        logger.error(`Push token ${pushToken} is not a valid Expo push token`);
        return;
      }

      const messages: ExpoPushMessage[] = [];
      messages.push({
        to: pushToken,
        sound: "default",
        title: title,
        body: message,
        data: { orderId: orderId },
      });

      const chunks = expo.chunkPushNotifications(messages);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
        } catch (error) {
          logger.error("Error sending push notifications", error);
        }
      }

      logger.info(`Notification sent to ${userId}`);
    } catch (error) {
      logger.error("Error fetching user or sending notification", error);
    }
  }
);

/*
 * TRIGGER: When a new Store is created
 * ACTION: Sends a "Welcome" email to the vendor via Resend
 */
export const onStoreCreated = onDocumentCreated(
  "stores/{storeId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return; // Document deleted or invalid

    const store = snapshot.data();
    const ownerId = store.ownerId;

    if (!ownerId) {
      logger.warn(`Store ${event.params.storeId} has no ownerId.`);
      return;
    }

    try {
      // 1. Fetch Owner's Email
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(ownerId)
        .get();
      const user = userDoc.data();

      if (!user || !user.email) {
        logger.warn(`Owner ${ownerId} has no email address.`);
        return;
      }

      // 2. Send Email via Resend
      const resend = new Resend(process.env.RESEND_API_KEY); // Lazy Init
      const { data, error } = await resend.emails.send({
        from: "Drop <onboarding@resend.dev>", // TODO: Change to your verified domain (e.g. welcome@copdrop.io)
        to: [user.email],
        subject: `WELCOME TO THE FAMILY`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 60px 20px; text-align: center;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1 style="font-size: 48px; font-weight: 900; margin-bottom: 10px; letter-spacing: -2px;">OWN THE HYPE.</h1>
              <div style="width: 50px; height: 4px; background: linear-gradient(90deg, #A855F7, #EC4899, #F97316); margin: 0 auto 30px;"></div>
              
              <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 40px;">
                Hi <strong>${user.fullName || "Creator"}</strong>,<br/><br/>
                Your store <strong>${
                  store.name
                }</strong> is officially live. You operate on your own terms now.
              </p>

              <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; margin-bottom: 40px; text-align: left;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Your Launch Checklist:</h3>
                <ul style="color: #ccc; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">Login to your Dashboard</li>
                  <li style="margin-bottom: 10px;">Add your first Product</li>
                  <li style="margin-bottom: 10px;">Share your link: <strong>copdrop.io/shop/${
                    store.slug
                  }</strong></li>
                </ul>
              </div>

              <a href="https://copdrop.io/admin" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px; transition: transform 0.2s;">
                GO TO DASHBOARD
              </a>

              <p style="margin-top: 60px; font-size: 12px; color: #666666;">
                © 2025 The Drop. • Accra, Ghana
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        logger.error("Resend API Error:", error);
      } else {
        logger.info(`Welcome email sent to ${user.email}. ID: ${data?.id}`);
      }
    } catch (err) {
      logger.error("Failed to execute onStoreCreated logic", err);
    }
  }
);

// --- ORDER TRIGGER ---

export const onOrderCreated = onDocumentCreated(
  "stores/{storeId}/orders/{orderId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const order = snapshot.data();
    const orderId = event.params.orderId;
    const storeId = event.params.storeId;

    if (!storeId) {
      logger.warn(`Order ${orderId} has no storeId in path`);
      return;
    }

    await processOrderWallet(orderId, order, storeId);
  }
);

// --- PAYOUT SYSTEM ---

export const getBanks = onCall(async () => {
  return await listBanks();
});

export const verifyBankAccount = onCall(async (request) => {
  const { accountNumber, bankCode } = request.data;
  if (!accountNumber || !bankCode) {
    throw new HttpsError("invalid-argument", "Missing account details");
  }
  return await resolveAccount(accountNumber, bankCode);
});

export const createTransferRecipient = onCall(async (request) => {
  const { type, name, accountNumber, bankCode } = request.data;
  // type should be "nuban" or "mobile_money"
  return await createRecipient({
    type,
    name,
    account_number: accountNumber,
    bank_code: bankCode,
  });
});

export const initiateWithdrawal = onCall(async (request) => {
  const { amount, storeId } = request.data;
  const auth = request.auth;

  if (!auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }

  if (!storeId || !amount) {
    throw new HttpsError("invalid-argument", "Missing storeId or amount");
  }

  // Verify Ownership
  const storeDoc = await admin
    .firestore()
    .collection("stores")
    .doc(storeId)
    .get();

  if (!storeDoc.exists || storeDoc.data()?.ownerId !== auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to withdraw from this store"
    );
  }

  return await handleWithdrawal(storeId, amount);
});

export { migrateToMultiVendor } from "./migrate_to_multi_vendor";
