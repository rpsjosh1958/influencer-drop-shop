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
        const uniqueTokens = new Set<string>();

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const token = userData.expoPushToken;
          
          if (token && Expo.isExpoPushToken(token) && !uniqueTokens.has(token)) {
            uniqueTokens.add(token);
            messages.push({
              to: token,
              sound: "default",
              title: title,
              body: message,
              data: { orderId: orderId, type: "broadcast" }, // Tag broadcast for routing
            });
          }
        });

        if (messages.length === 0) {
          logger.info("No unique users with valid tokens found for broadcast");
          return;
        }

        logger.info(`Sending broadcast to ${messages.length} unique tokens...`);
        
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
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      
      // 0. Fetch Owner's Data to check for existing subscription
      const userRef = db.collection("users").doc(ownerId);
      const userDoc = await userRef.get();
      const user = userDoc.data();

      if (!user) {
        logger.warn(`Owner ${ownerId} not found.`);
        return;
      }

      let plan = "starter";
      let expiresAt = null;
      let isTrial = false;

      // If user already has a plan/expiry on their profile, use it
      if (user.plan === "growth" && user.planExpiresAt) {
        plan = "growth";
        expiresAt = user.planExpiresAt;
        isTrial = user.isTrial || false;
        logger.info(`New Store ${event.params.storeId} inheriting existing Growth plan from User ${ownerId}`);
      } else if (!user.hasUsedTrial) {
        // New User/Trial: Activate 30-Day Free Trial (Growth Plan)
        plan = "growth";
        isTrial = true;
        const trialDays = 30;
        expiresAt = new admin.firestore.Timestamp(
          now.seconds + trialDays * 24 * 60 * 60,
          now.nanoseconds
        );
        
        // Update User Profile with the new plan (Centralized)
        await userRef.update({
          plan,
          isTrial,
          planExpiresAt: expiresAt,
          hasUsedTrial: true, // Mark trial as used permanently
        });
        logger.info(`Activated 30-Day Free Trial for User ${ownerId} (Account-wide)`);
      } else {
        // User has already used trial and is currently on starter
        plan = "starter";
        expiresAt = null;
        isTrial = false;
        logger.info(`User ${ownerId} has already used trial. Defaulting to Starter for new store.`);
      }

      // Sync Store with the Account Plan
      await snapshot.ref.update({
        plan,
        isTrial,
        planExpiresAt: expiresAt,
        isVerified: false, // New stores are 'pending' KYC, so impossible to be verified instantly
      });
      logger.info(
        `Synced Plan (${plan}) to Store ${event.params.storeId}`
      );
    } catch (err) {
      logger.error("Failed to execute onStoreCreated logic", err);
    }
  }
);

/*
 * TRIGGER: When User document is updated (Account-wide Plan changes)
 * ACTION: Sync the new Plan and Expiry to ALL stores owned by the user.
 */
export const onUserSubscriptionUpdated = onDocumentUpdated(
  "users/{userId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    const userId = event.params.userId;

    // Check if Plan or Expiry changed
    const planChanged = before.plan !== after.plan;
    const expiryChanged = before.planExpiresAt?.seconds !== after.planExpiresAt?.seconds;

    if (!planChanged && !expiryChanged) return;

    logger.info(`User ${userId} plan/expiry updated. Syncing to all stores...`);

    try {
      const db = admin.firestore();
      const storesSnapshot = await db
        .collection("stores")
        .where("ownerId", "==", userId)
        .get();

      if (storesSnapshot.empty) return;

      const batch = db.batch();
      storesSnapshot.forEach((doc) => {
        batch.update(doc.ref, {
          plan: after.plan || "starter",
          planExpiresAt: after.planExpiresAt || null,
          isVerified: after.plan === "growth" && doc.data().onboardingStatus === "approved",
          isTrial: after.isTrial || false,
        });
      });

      await batch.commit();
      logger.info(`Synced new plan to ${storesSnapshot.size} stores for user ${userId}`);
    } catch (err) {
      logger.error(`Failed to sync user plan to stores for ${userId}`, err);
    }
  }
);

/*
 * TRIGGER: When Store is Updated (e.g. Plan Upgrade)
 * ACTION: If upgrading to Growth via Paystack or Admin, update USER and then let sync handle other stores.
 */
export const onStoreUpdated = onDocumentUpdated(
  "stores/{storeId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    const storeId = event.params.storeId;
    const ownerId = after.ownerId;

    // Check for Plan Upgrade: Starter -> Growth
    if (before.plan === "starter" && after.plan === "growth") {
      logger.info(
        `Detected Plan Upgrade for Store ${storeId}. Updating User document ${ownerId}...`
      );
      
      const now = admin.firestore.Timestamp.now();
      const cycle = after.billingCycle || "monthly";
      let days = 30;

      if (cycle === "quarterly") days = 90;
      if (cycle === "annual") days = 365;

      const expiresAt = new admin.firestore.Timestamp(
        now.seconds + days * 24 * 60 * 60,
        now.nanoseconds
      );

      // CRITICAL: Update the USER document. 
      // The onUserSubscriptionUpdated trigger will then sync this to all OTHER stores.
      if (ownerId) {
        await admin.firestore().collection("users").doc(ownerId).update({
          plan: "growth",
          planExpiresAt: expiresAt,
          isTrial: false,
          billingCycle: cycle,
        });
      }

      await snapshot.after.ref.update({
        planExpiresAt: expiresAt,
        isVerified: true,
        planChangedAt: now,
      });

      await releasePendingFunds(storeId);
    }
  }
);

// --- ORDER TRIGGER ---

// Helper to send Notification (Push + Firestore)
async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
  type: string,
  data: any
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
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
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

    // Safety check for Expo SDK instance, assuming global 'expo' const or init here
    const expoClient = new Expo();
    await expoClient.sendPushNotificationsAsync(messages as any);
  } catch (error) {
    logger.error(`Failed to send notification to ${userId}`, error);
  }
}

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

    // --- NOTIFICATION LOGIC ---
    try {
      // 1. Fetch Store & Owner
      const storeDoc = await admin
        .firestore()
        .collection("stores")
        .doc(storeId)
        .get();
      const store = storeDoc.data();
      if (!store || !store.ownerId) return;

      const ownerDoc = await admin
        .firestore()
        .collection("users")
        .doc(store.ownerId)
        .get();
      const owner = ownerDoc.data();
      if (!owner || !owner.email) return;

      // 2. Send Notification to Vendor
      await sendNotificationToUser(
        store.ownerId,
        "New Order! 💰",
        `New order from ${
          order.customerName || "Customer"
        } (GHS ${order.total.toFixed(2)})`,
        "vendor_order",
        { screen: "/(vendor)/orders", id: orderId, storeId }
      );

      // 3. Send Email to Vendor (DISABLED: Notifications handle this now)
      // const resend = new Resend(process.env.RESEND_API_KEY);
      // await resend.emails.send({
      //   from: "The Drop Orders <orders@copdrop.io>",
      //   to: [owner.email],
      //   subject: `New Order: #${orderId.slice(0, 8).toUpperCase()} - ${
      //     store.name
      //   }`,
      //   html: `
      //     <div style="font-family: sans-serif; padding: 20px;">
      //       <h2>New Order Received! 💰</h2>
      //       <p>You have a new order from <strong>${
      //         order.customerName || "Customer"
      //       }</strong>.</p>
      //       <p><strong>Total:</strong> GHS ${order.total.toFixed(2)}</p>
      //       <p><strong>Items:</strong> ${order.items.length}</p>
      //       <hr />
      //       <a href="https://copdrop.io/admin/orders" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order</a>
      //     </div>
      //   `,
      // });
      logger.info(
        `Order notification sent to vendor ${owner.email} (Email Disabled)`
      );
      logger.info(`Order notification sent to vendor ${owner.email}`);
    } catch (err) {
      logger.error("Failed to send order notification", err);
    }
  }
);

/*
 * TRIGGER: When a Booking is created
 * ACTION: Notify Vendor & Customer
 */
export const onBookingCreated = onDocumentCreated(
  "stores/{storeId}/bookings/{bookingId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const booking = snapshot.data();
    const storeId = event.params.storeId;
    const bookingId = event.params.bookingId;

    try {
      // Fetch Store Info
      const storeDoc = await admin
        .firestore()
        .collection("stores")
        .doc(storeId)
        .get();
      const store = storeDoc.data();
      if (!store) return;

      // const resend = new Resend(process.env.RESEND_API_KEY);

      // 1. Notify Vendor (Email + Push)
      if (store.ownerId) {
        // Push + App Notification
        await sendNotificationToUser(
          store.ownerId,
          "New Booking Request 📅",
          `${booking.customerName} booked ${booking.serviceName} for ${booking.date}`,
          "vendor_booking",
          { screen: "/(vendor)/bookings", id: bookingId, storeId }
        );

        // const owner = ownerDoc.data();
        // if (owner && owner.email) {
          // Email to Vendor DISABLED
          // await resend.emails.send({ ... });
        // }
      }

      // 2. Notify Customer (Email DISABLED)
      if (booking.customerEmail) {
        // await resend.emails.send({ ... });
      }
    } catch (err) {
      logger.error("Failed to process booking creation", err);
    }
  }
);

/*
 * TRIGGER: When Booking Status Changes
 * ACTION: Notify Customer
 */
export const onBookingStatusUpdated = onDocumentUpdated(
  "stores/{storeId}/bookings/{bookingId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    const storeId = event.params.storeId;

    // Only run if status changed
    if (before.status === after.status) return;

    try {
      const storeDoc = await admin
        .firestore()
        .collection("stores")
        .doc(storeId)
        .get();
      const store = storeDoc.data();
      if (!store || !after.customerEmail) return;

      // Push to Customer (Optional: if they have app)
      // await sendPushToUser(after.customerId, "Booking Update", `Status: ${after.status}`, { type: "customer_booking", id: bookingId });

      // const resend = new Resend(process.env.RESEND_API_KEY);
      // let subject = `Update on your booking with ${store.name}`;
      // let message = `The status of your booking has been updated to <strong>${after.status}</strong>.`;

      // if (after.status === "confirmed") {
      //   subject = `Booking Confirmed! 🎉 - ${store.name}`;
      //   message = `Great news! Your appointment for <strong>${after.serviceName}</strong> has been confirmed.`;
      // } else if (after.status === "cancelled") {
      //   subject = `Booking Cancelled - ${store.name}`;
      //   message = `Your appointment for <strong>${after.serviceName}</strong> has been cancelled. Please contact the store if this was a mistake.`;
      // } else if (after.status === "completed") {
      //   subject = `Thanks for visiting ${store.name}!`;
      //   message = `We hope you enjoyed your service! Thanks for booking with us.`;
      // }

      /* EMAILS DISABLED
      await resend.emails.send({
        from: "The Drop <reservations@copdrop.io>",
        to: [after.customerEmail],
        subject: subject,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Booking Update</h2>
            <p>Hi ${after.customerName},</p>
            <p>${message}</p>
            <div style="background: #f4f4f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${after.date}</p>
                <p style="margin: 5px 0;"><strong>Time:</strong> ${after.startTime}</p>
            </div>
          </div>
        `,
      });
      */
    } catch (err) {
      logger.error("Failed to send booking status update", err);
    }
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
 * ACTION: Notify the Store Owner via Email & Push
 */
export const onComplaintCreated = onDocumentCreated(
  "stores/{storeId}/complaints/{complaintId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const complaint = snapshot.data();
    const storeId = event.params.storeId;
    const complaintId = event.params.complaintId;
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

      // Notify Vendor via Push
      if (target === "store") {
        await sendNotificationToUser(
          store.ownerId,
          "New Complaint ⚠️",
          `${complaint.subject} - ${complaint.customerName}`,
          "vendor_complaint",
          { screen: "/(vendor)/(tabs)", id: complaintId, storeId }
        );
      }

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

  const storeData = storeDoc.data();
  if (!storeDoc.exists || storeData?.ownerId !== auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to withdraw from this store"
    );
  }

  // 2. Guard by Onboarding Status & Suspension
  const isApproved = !storeData.onboardingStatus || storeData.onboardingStatus === "approved";
  if (!isApproved) {
    throw new HttpsError(
      "failed-precondition",
      "Your store must be approved before you can withdraw funds."
    );
  }

  if (storeData.isSuspended) {
    throw new HttpsError(
      "permission-denied",
      "Withdrawals are disabled for suspended stores. Please contact support."
    );
  }

  return await handleWithdrawal(storeId, amount);
});

export { migrateToMultiVendor } from "./migrate_to_multi_vendor";
export { checkSubscriptionExpiry };
export { sendPasswordReset } from "./auth";
export * from "./onboarding";
