import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import { resolveAccount, createRecipient, listBanks } from "./paystack";
import {
  processOrderWallet,
  handleWithdrawal,
  releasePendingFunds,
} from "./wallet";
import { checkSubscriptionExpiry } from "./subscriptions";

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
      // 0. Activate 30-Day Free Trial (Growth Plan)
      // We override whatever the client sent (usually 'starter')
      const now = admin.firestore.Timestamp.now();
      const trialDays = 30;
      const expiresAt = new admin.firestore.Timestamp(
        now.seconds + trialDays * 24 * 60 * 60,
        now.nanoseconds
      );

      await snapshot.ref.update({
        plan: "growth",
        isTrial: true,
        planExpiresAt: expiresAt,
        isVerified: true, // Enable Verification Badge for Growth Plan Trial
      });
      logger.info(
        `Activated 30-Day Free Trial for Store ${event.params.storeId}`
      );

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
        from: "The Drop <welcome@copdrop.io>",
        to: [user.email],
        subject: `Welcome to the Family`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 60px 20px; text-align: center;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1 style="font-size: 48px; font-weight: 900; margin-bottom: 10px; letter-spacing: -2px;">Own The Hype.</h1>
              <div style="width: 50px; height: 4px; background: linear-gradient(90deg, #A855F7, #EC4899, #F97316); margin: 0 auto 30px;"></div>
              
              <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 20px;">
                Hi <strong>${user.fullName || "Creator"}</strong>,<br/><br/>
                Your store <strong>${store.name}</strong> is live.
              </p>

              <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 40px; border: 1px solid #333;">
                <p style="font-size: 16px; color: #fff; margin: 0;">
                  🎁 <strong>You've unlocked a 30-Day Free Trial of Growth Plan.</strong><br/>
                  <span style="color: #999; font-size: 14px;">Enjoy 0% platform fees, verified badge eligibility, and mobile app access.</span>
                </p>
              </div>

              <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; margin-bottom: 40px; text-align: left;">
                <h3 style="margin-top: 0; margin-bottom: 15px;">Your Launch Checklist:</h3>
                <ul style="color: #ccc; padding-left: 20px;">
                  <li style="margin-bottom: 10px;">Login to your Dashboard: <strong>copdrop.io/admin</strong></li>
                  <li style="margin-bottom: 10px;">Add your first Product</li>
                  <li style="margin-bottom: 10px;">Share your link: <strong>copdrop.io/shop/${
                    store.slug
                  }</strong></li>
                </ul>
              </div>

              <a href="https://copdrop.io/admin" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px; transition: transform 0.2s;">
                Go to Dashboard
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

/*
 * TRIGGER: When Store is Updated (e.g. Plan Upgrade)
 * ACTION: If upgrading to Growth, release pending funds immediately.
 */
export const onStoreUpdated = onDocumentUpdated(
  "stores/{storeId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    const storeId = event.params.storeId;

    // Check for Plan Upgrade: Starter -> Growth
    if (before.plan === "starter" && after.plan === "growth") {
      logger.info(
        `Detected Plan Upgrade for Store ${storeId}. Releasing funds...`
      );
      await releasePendingFunds(storeId);
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

/*
 * TRIGGER: When a Review is created
 * ACTION: Aggregate Ratings for the Store
 */
export const onReviewCreated = onDocumentCreated(
  "stores/{storeId}/reviews/{reviewId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const review = snapshot.data();
    const storeId = event.params.storeId;
    const rating = review.rating || 0;

    const storeRef = admin.firestore().collection("stores").doc(storeId);

    try {
      await admin.firestore().runTransaction(async (t) => {
        const storeDoc = await t.get(storeRef);
        if (!storeDoc.exists) return;

        const data = storeDoc.data();
        const currentCount = data?.reviewCount || 0;
        const currentRating = data?.rating || 0;
        const currentDist = data?.ratingDistribution || {};

        const newCount = currentCount + 1;
        // Calculate new weighted moving average
        const newRating = (currentRating * currentCount + rating) / newCount;

        // Update Distribution (Simple integer key based on rounded rating)
        const starKey = Math.round(rating).toString();
        const newDist = {
          ...currentDist,
          [starKey]: (currentDist[starKey] || 0) + 1,
        };

        t.update(storeRef, {
          reviewCount: newCount,
          rating: Number(newRating.toFixed(2)), // Keep 2 decimal places
          ratingDistribution: newDist,
        });
      });
      logger.info(`Updated ratings for Store ${storeId}`);
    } catch (error) {
      logger.error("Failed to aggregate reviews", error);
    }
  }
);

/*
 * TRIGGER: When a Complaint is created
 * ACTION: Notify the Store Owner via Email
 */
export const onComplaintCreated = onDocumentCreated(
  "stores/{storeId}/complaints/{complaintId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const complaint = snapshot.data();
    const storeId = event.params.storeId;
    const target = complaint.target || "store";

    try {
      // 1. Fetch Store & Owner
      const storeDoc = await admin
        .firestore()
        .collection("stores")
        .doc(storeId)
        .get();
      const store = storeDoc.data();
      if (!store || !store.ownerId) return;

      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(store.ownerId)
        .get();
      const user = userDoc.data();
      if (!user || !user.email) return;

      // 2. Prepare Email Content
      const resend = new Resend(process.env.RESEND_API_KEY);
      const subject =
        target === "platform"
          ? `[Platform Report] Complaint from ${store.name}`
          : `New Complaint: ${complaint.subject}`;

      const recipient =
        target === "platform" ? "safety@copdrop.io" : user.email;

      // 3. Send Email
      await resend.emails.send({
        from: "The Drop Support <complaints@copdrop.io>",
        to: [recipient],
        subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Complaint Received</h2>
            <p><strong>Store:</strong> ${store.name}</p>
            <p><strong>Customer:</strong> ${complaint.customerName} (${complaint.customerEmail})</p>
            <p><strong>Subject:</strong> ${complaint.subject}</p>
            <hr />
            <p style="white-space: pre-wrap;">${complaint.message}</p>
            <hr />
            <a href="https://copdrop.io/admin/complaints" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View in Dashboard</a>
          </div>
        `,
      });

      logger.info(`Complaint notification sent to ${recipient}`);
    } catch (error) {
      logger.error("Error sending complaint notification", error);
    }
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
export { checkSubscriptionExpiry };
export { sendPasswordReset } from "./auth";
