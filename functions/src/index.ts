import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import * as crypto from "crypto";
import {
  resolveAccount,
  listBanks,
  createSubaccount,
  updateSubaccount,
  verifyTransaction,
  initializeTransaction,
} from "./paystack";
import { processOrderWallet, releasePendingFunds } from "./wallet";
import { checkSubscriptionExpiry } from "./subscriptions";
import { createOrderFromVerifiedPayment } from "./orders";
import { getPlatformFeePercentage } from "./fees";
import { applySubscriptionPaymentIfVerified } from "./subscriptionPayments";
import { BILLING_PLANS } from "./billing";
import { reserveStockAndPrice, releaseStock } from "./stock";
import { initiateOrderRefund } from "./refunds";
import { sendNotificationToUser } from "./notifications";
import { getEmailLayout, emailButton, emailCallout } from "./email-layout";

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
    // The real routing payload (orderId/bookingId/screen/etc.) lives
    // nested under `data.data` — sendNotificationToUser and every client
    // writer use that shape, never a top-level `orderId` field. Reading
    // `data.orderId` directly here always resolved to undefined, so a
    // push sent via this trigger never carried the fields the mobile
    // notification-routing helpers depend on to deep-link.
    const notificationData = (data.data || {}) as Record<string, unknown>;

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
              data: { ...notificationData, type: data.type || "broadcast" },
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
        data: { ...notificationData, type: data.type },
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
    // Gated on isTrial !== true because onStoreCreated's own trial-grant
    // write (a brand-new store going starter -> growth the moment it's
    // created, to hand out the 30-day trial) is indistinguishable from a
    // real paid upgrade by the plan transition alone — both produce the
    // exact same before/after diff. Without this guard, every single
    // new-vendor trial activation was mistaken for a paid upgrade here,
    // which clobbered the correct isTrial:true back to false (killing the
    // "You've unlocked a 30-Day Free Trial" block in the approval email),
    // AND prematurely set isVerified:true on a store that hadn't been
    // through onboarding review yet. A real paid upgrade (via
    // subscriptionPayments.ts -> onUserSubscriptionUpdated's cascade)
    // always writes isTrial:false, so this still fires correctly for
    // genuine upgrades.
    if (before.plan === "starter" && after.plan === "growth" && after.isTrial !== true) {
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

    // Keep the store's Paystack Subaccount fee split in sync with whatever
    // its plan is now — covers upgrades, downgrades, and expiry-driven
    // downgrades alike (all of which land here via the plan fan-out),
    // unlike the block above which only handled the starter->growth case.
    // Skipped while a refund debt is still being recovered (see
    // refunds.ts/wallet.ts) — that intentionally runs the subaccount at an
    // elevated rate regardless of plan, and a plan change landing mid-
    // recovery shouldn't silently reset it back down; processOrderWallet
    // re-syncs to the (by-then-current) plan rate itself once the debt
    // actually clears.
    const hasOutstandingRefundDebt = (after.pendingRefundDebt || 0) > 0;
    if (
      before.plan !== after.plan &&
      after.payoutConfig?.subaccountCode &&
      !hasOutstandingRefundDebt
    ) {
      try {
        await updateSubaccount(after.payoutConfig.subaccountCode, {
          percentage_charge: getPlatformFeePercentage(after.plan),
        });
      } catch (err) {
        logger.error(
          `Failed to sync subaccount fee for store ${storeId} after plan change`,
          err
        );
      }
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

      // 2. Send Notification to Vendor
      // (Was previously also gated on the owner's Firestore user doc
      // having an `email` field, left over from when this also sent an
      // email — that email send is now fully disabled below, but the
      // guard was never removed, so a vendor whose `users/{uid}` doc has
      // no `email` field (email lives in Firebase Auth, not always
      // mirrored to Firestore) silently never got a new-order
      // notification at all, with no error logged. Same bug existed on
      // the complaint-created trigger further down.)
      await sendNotificationToUser(
        store.ownerId,
        "New Order! 💰",
        `New order from ${
          order.customerName || "Customer"
        } (GHS ${order.total.toFixed(2)})`,
        "vendor_order",
        {
          screen: `/(vendor)/orders?orderId=${orderId}`,
          id: orderId,
          orderId,
          storeId,
        }
      );

      logger.info(`Order notification sent to vendor ${store.ownerId}`);

      // 3. Email the Vendor — was push-only until now (no email code ever
      // existed for this trigger, unlike the disabled-but-present blocks
      // on bookings/complaints). Skip for a vendor's own manually-logged
      // sale (paymentMethod: "manual", cash/DM order entry) — emailing
      // someone about an order they just typed in themselves is just noise.
      if (order.paymentMethod !== "manual") {
        const userDoc = await admin
          .firestore()
          .collection("users")
          .doc(store.ownerId)
          .get();
        const recipient = userDoc.data()?.email;

        if (recipient) {
          const items = (order.items || []) as Array<{
            name?: string;
            quantity?: number;
            price?: number;
            selectedVariant?: { name?: string } | null;
          }>;
          const itemsList = items
            .map(
              (item) =>
                `<tr>
                  <td style="padding: 8px 0; color: #e4e4e7; text-align: left;">
                    ${item.name || "Item"}${item.selectedVariant?.name ? ` (${item.selectedVariant.name})` : ""}
                    <span style="color: #a1a1aa;"> × ${item.quantity || 1}</span>
                  </td>
                  <td style="padding: 8px 0; color: #e4e4e7; text-align: right;">
                    GHS ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                  </td>
                </tr>`
            )
            .join("");

          const shipping = order.shipping as
            | { fullName?: string; phone?: string; address?: string }
            | undefined;

          const orderContent = `
            <p style="font-size: 18px; color: #cccccc; line-height: 1.6; margin-bottom: 20px; text-align: left;">
              <strong>Order #${orderId.slice(0, 8).toUpperCase()}</strong><br/>
              <strong>Customer:</strong> ${order.customerName || "Customer"}${shipping?.phone ? ` (${shipping.phone})` : ""}
              ${shipping?.address ? `<br/><strong>Ships to:</strong> ${shipping.address}` : ""}
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              ${itemsList}
              <tr>
                <td style="padding: 16px 0 0; color: #ffffff; font-weight: 900; text-align: left; border-top: 1px solid rgba(255,255,255,0.15);">Total</td>
                <td style="padding: 16px 0 0; color: #ffffff; font-weight: 900; text-align: right; border-top: 1px solid rgba(255,255,255,0.15);">GHS ${order.total.toFixed(2)}</td>
              </tr>
            </table>
            ${order.customerNote ? emailCallout("Customer Note", `<p style="margin: 0;">${order.customerNote}</p>`) : ""}
            ${emailButton("https://copdrop.io/admin/orders", "View Order")}
          `;

          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "The Drop <orders@copdrop.io>",
            to: [recipient],
            subject: `New Order! GHS ${order.total.toFixed(2)} from ${order.customerName || "a customer"}`,
            html: getEmailLayout(orderContent, "New Order."),
          });
          logger.info(`Order notification emailed to ${recipient}`);
        } else {
          logger.warn(
            `Order ${orderId}: no email on file for store owner ${store.ownerId}, skipping email`
          );
        }
      }

      // 4. Email the Customer — order confirmation/receipt. Never existed
      // before (only a push/in-app notification does, and that requires an
      // account + push token). Fires for manual/cash sales too, unlike the
      // vendor email above — a customer's receipt isn't noise just because
      // the vendor logged the sale by hand — but skips the manual-order
      // form's placeholder address (not a real customer-supplied email).
      if (order.customerEmail && order.customerEmail !== "manual@store.com") {
        const items = (order.items || []) as Array<{
          name?: string;
          quantity?: number;
          price?: number;
          selectedVariant?: { name?: string } | null;
        }>;
        const itemsList = items
          .map(
            (item) =>
              `<tr>
                <td style="padding: 8px 0; color: #e4e4e7; text-align: left;">
                  ${item.name || "Item"}${item.selectedVariant?.name ? ` (${item.selectedVariant.name})` : ""}
                  <span style="color: #a1a1aa;"> × ${item.quantity || 1}</span>
                </td>
                <td style="padding: 8px 0; color: #e4e4e7; text-align: right;">
                  GHS ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                </td>
              </tr>`
          )
          .join("");

        const storeIdentity = `
          ${store.logo ? `<img src="${store.logo}" alt="${store.name || "Store"}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;margin:0 auto 16px;display:block;" />` : ""}
          <p style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">${store.name || "Your Store"}</p>
        `;

        const customerContent = `
          ${storeIdentity}
          <p style="font-size: 18px; color: #cccccc; line-height: 1.6; margin-bottom: 20px; text-align: left;">
            Hi <strong>${order.customerName || "there"}</strong>,<br/><br/>
            Thanks for your order! Here's your receipt.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            ${itemsList}
            <tr>
              <td style="padding: 16px 0 0; color: #ffffff; font-weight: 900; text-align: left; border-top: 1px solid rgba(255,255,255,0.15);">Total</td>
              <td style="padding: 16px 0 0; color: #ffffff; font-weight: 900; text-align: right; border-top: 1px solid rgba(255,255,255,0.15);">GHS ${order.total.toFixed(2)}</td>
            </tr>
          </table>
          ${emailButton(`https://copdrop.io/shop/${storeId}`, "Visit Store")}
        `;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "The Drop <orders@copdrop.io>",
          to: [order.customerEmail],
          subject: `Order Confirmed! Thanks for shopping with ${store.name || "us"} 🎉`,
          html: getEmailLayout(customerContent, "Order Confirmed."),
        });
        logger.info(`Order confirmation emailed to ${order.customerEmail}`);
      }
    } catch (err) {
      logger.error("Failed to send order notification", err);
    }
  }
);

/*
 * TRIGGER: When an order's status changes
 * ACTION: Notify the customer
 *
 * Never existed as a working feature before — the customer previously only
 * ever saw an updated status by reopening the app (a plain Firestore read),
 * no push notification was ever sent. Guest checkouts (userId: "guest")
 * can't be notified — there's no account/push token to reach.
 */
export const onOrderStatusUpdated = onDocumentUpdated(
  "stores/{storeId}/orders/{orderId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    const storeId = event.params.storeId;
    const orderId = event.params.orderId;

    if (before.status === after.status) return;

    try {
      const storeDoc = await admin
        .firestore()
        .collection("stores")
        .doc(storeId)
        .get();
      const store = storeDoc.data();
      const storeName = store?.name || "the store";

      let title = "Order Update";
      let body = `Your order from ${storeName} is now "${after.status}".`;

      switch (after.status) {
        case "packaged":
          title = "Order Packaged 📦";
          body = `Your order from ${storeName} has been packaged and will ship soon.`;
          break;
        case "sent-out":
          title = "Order Shipped 🚚";
          body = `Your order from ${storeName} is on its way!`;
          break;
        case "delivered":
          title = "Order Delivered ✅";
          body = `Your order from ${storeName} has been delivered. Enjoy!`;
          break;
      }

      // Push — only for real accounts (guests have no account/token to
      // notify). type/data field names match what the web notification
      // dropdown and toast already expect (order_update / data.orderId) —
      // mobile only uses data.screen, so this is compatible with both.
      if (after.userId && after.userId !== "guest") {
        await sendNotificationToUser(after.userId, title, body, "order_update", {
          screen: `/(tabs)/orders?orderId=${orderId}`,
          orderId,
          storeId,
        });
      }

      // Email — address-based, not account-based, so this reaches guest
      // checkouts too (the one channel that can). Never existed before —
      // customers previously only found out by reopening the app.
      if (after.customerEmail) {
        const storeIdentity = `
          ${store?.logo ? `<img src="${store.logo}" alt="${storeName}" style="width:56px;height:56px;border-radius:14px;object-fit:cover;margin:0 auto 16px;display:block;" />` : ""}
          <p style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:2px;margin:0 0 20px;">${storeName}</p>
        `;

        const statusContent = `
          ${storeIdentity}
          <p style="font-size: 18px; color: #cccccc; line-height: 1.6; margin-bottom: 30px; text-align: left;">
            Hi <strong>${after.customerName || "there"}</strong>,<br/><br/>
            ${body}
          </p>
          ${emailButton(`https://copdrop.io/shop/${storeId}`, "Visit Store")}
        `;

        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "The Drop <orders@copdrop.io>",
          to: [after.customerEmail],
          subject: `${title} — ${storeName}`,
          html: getEmailLayout(statusContent, title),
        });
        logger.info(`Order status update (${after.status}) emailed to ${after.customerEmail}`);
      }
    } catch (err) {
      logger.error("Failed to send order status notification", err);
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
      if (!store) return;

      // Push to customer — skip guest bookings, no account/token to notify.
      if (after.customerId && after.customerId !== "guest") {
        let title = "Booking Update";
        let body = `Your booking with ${store.name || "the store"} is now "${after.status}".`;

        switch (after.status) {
          case "confirmed":
            title = "Booking Confirmed! 🎉";
            body = `Your appointment for ${after.serviceName || "your service"} with ${store.name || "the store"} has been confirmed.`;
            break;
          case "completed":
            title = `Thanks for visiting ${store.name || "us"}!`;
            body = "We hope you enjoyed your service! Thanks for booking with us.";
            break;
          case "cancelled":
            title = "Booking Cancelled";
            body = `Your appointment for ${after.serviceName || "your service"} has been cancelled. Contact the store if this was a mistake.`;
            break;
          case "no-show":
            title = "Missed Appointment";
            body = `You were marked as a no-show for your appointment with ${store.name || "the store"}.`;
            break;
        }

        // type/data field names match what the web notification dropdown
        // and toast expect for bookings (booking_update / data.bookingId).
        await sendNotificationToUser(
          after.customerId,
          title,
          body,
          "booking_update",
          {
            screen: `/(tabs)/orders?bookingId=${event.params.bookingId}`,
            bookingId: event.params.bookingId,
            storeId,
          }
        );
      }

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

      // Notify Vendor via Push — must not depend on the owner having an
      // `email` field on their Firestore user doc (that lives in Firebase
      // Auth and isn't always mirrored to Firestore). This used to be
      // gated behind an `if (!user || !user.email) return;` guard that
      // bailed out of the whole function before either the push
      // notification OR (for a platform-target report, which doesn't even
      // use the vendor's email) the email below ever ran.
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
      const subject =
        target === "platform"
          ? `[Platform Report] Complaint from ${store.name}`
          : `New Complaint: ${complaint.subject}`;

      const recipient =
        target === "platform" ? "safety@copdrop.io" : user?.email;

      // 3. Send Email — skip only the email (not the push above) if there's
      // genuinely no recipient (store-target complaint, owner has no email).
      if (recipient) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const complaintContent = `
          <p style="font-size: 18px; color: #cccccc; line-height: 1.6; margin-bottom: 30px; text-align: left;">
            <strong>Store:</strong> ${store.name}<br/>
            <strong>Customer:</strong> ${complaint.customerName} (${complaint.customerEmail})<br/>
            <strong>Subject:</strong> ${complaint.subject}
          </p>
          ${emailCallout("Message", `<p style="white-space: pre-wrap; margin: 0;">${complaint.message}</p>`)}
          ${emailButton("https://copdrop.io/admin/complaints", "View in Dashboard")}
        `;

        await resend.emails.send({
          from: "The Drop Support <complaints@copdrop.io>",
          to: [recipient],
          subject,
          html: getEmailLayout(complaintContent, "New Complaint."),
        });
        logger.info(`Complaint notification emailed to ${recipient}`);
      } else {
        logger.warn(
          `Complaint ${complaintId}: no email on file for store owner ${store.ownerId}, skipping email`
        );
      }
    } catch (error) {
      logger.error("Error sending complaint notification", error);
    }
  }
);

// --- PAYOUT SYSTEM ---

export const getBanks = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  return await listBanks();
});

export const verifyBankAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { accountNumber, bankCode } = request.data;
  if (!accountNumber || !bankCode) {
    throw new HttpsError("invalid-argument", "Missing account details");
  }
  return await resolveAccount(accountNumber, bankCode);
});

// Creates (or updates in place, if the store already has one — e.g. a
// vendor changing their payout number) a Paystack Subaccount, so checkout
// can split payments to this vendor automatically, and writes payoutConfig
// server-side. A store only becomes sellable once this has run (see
// initializeOrderPayment's subaccountCode check). Vendor payouts settle
// automatically via the Subaccount from here — there's no separate
// recipient/manual-transfer step anymore.
export const linkPayoutMethod = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { storeId, type, name, accountNumber, bankCode, bankName } =
    request.data;
  if (!storeId || !type || !name || !accountNumber || !bankCode) {
    throw new HttpsError("invalid-argument", "Missing payout details");
  }

  const storeRef = admin.firestore().collection("stores").doc(storeId);
  const storeDoc = await storeRef.get();
  const storeData = storeDoc.data();
  if (!storeDoc.exists || storeData?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to configure payouts for this store"
    );
  }

  const plan = storeData?.plan || "starter";
  const existingSubaccountCode = storeData?.payoutConfig?.subaccountCode;

  // Update in place if this store already has a subaccount (changing payout
  // method), rather than creating a new one and orphaning the old one.
  const subaccountCode = existingSubaccountCode
    ? (
        await updateSubaccount(existingSubaccountCode, {
          bank_code: bankCode,
          account_number: accountNumber,
          percentage_charge: getPlatformFeePercentage(plan),
        })
      ).subaccount_code || existingSubaccountCode
    : (
        await createSubaccount({
          business_name: storeData?.name || name,
          bank_code: bankCode,
          account_number: accountNumber,
          percentage_charge: getPlatformFeePercentage(plan),
        })
      ).subaccount_code;

  const payoutConfig = {
    provider: type === "mobile_money" ? "momo" : "bank",
    bankCode,
    bankName: bankName || "",
    accountNumber,
    accountName: name,
    subaccountCode,
  };

  await storeRef.update({ payoutConfig });

  return { subaccountCode };
});

// --- VERIFIED CHECKOUT ---

// Step 1 of checkout: recomputes the order total server-side from real
// product data (never trusts a client-supplied total), requires the store
// to have completed payout setup (a Subaccount), and starts a Paystack
// transaction split to that subaccount. Callable by guests (no auth
// requirement) since guest checkout is supported.
export const initializeOrderPayment = onCall(async (request) => {
  const { storeId, items, shipping, customerNote, guestEmail } =
    request.data;

  if (
    !storeId ||
    !Array.isArray(items) ||
    items.length === 0 ||
    !shipping
  ) {
    throw new HttpsError("invalid-argument", "Missing order details");
  }

  const db = admin.firestore();
  const storeDoc = await db.collection("stores").doc(storeId).get();
  if (!storeDoc.exists) {
    throw new HttpsError("not-found", "Store not found");
  }
  const store = storeDoc.data()!;

  // Suspension and onboarding approval were previously enforced only by the
  // storefront's client-side UI (StoreProvider) — a real gap, since nothing
  // stopped a direct callable invocation from completing a real payment on
  // a suspended or not-yet-approved store regardless of what the UI showed.
  if (store.isSuspended) {
    throw new HttpsError(
      "failed-precondition",
      "This store is currently unavailable."
    );
  }
  if (store.onboardingStatus && store.onboardingStatus !== "approved") {
    throw new HttpsError(
      "failed-precondition",
      "This store is not yet approved to accept orders."
    );
  }

  const subaccountCode = store.payoutConfig?.subaccountCode;
  if (!subaccountCode) {
    throw new HttpsError(
      "failed-precondition",
      "This store hasn't finished payout setup yet and can't accept payments."
    );
  }

  const email = request.auth?.token?.email || guestEmail;
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "An email is required to receive a payment receipt"
    );
  }

  // Validates availability, computes real prices, and atomically decrements
  // stock/variant stock — server-side, since the client Firestore rules
  // can't safely allow a public write to the `variants` field (that's how
  // variant-product checkout was broken before: the rule only ever allowed
  // `stock`, not `variants`, so any variant purchase was rejected).
  const { verifiedItems, totalGHS } = await reserveStockAndPrice(
    storeId,
    items
  );

  const expectedAmountPesewas = Math.round(totalGHS * 100);
  const reference = `drop_${crypto.randomBytes(12).toString("hex")}`;

  try {
    await db
      .collection("payment_intents")
      .doc(reference)
      .set({
        storeId,
        items: verifiedItems,
        shipping,
        customerNote: customerNote || "",
        userId: request.auth?.uid || "guest",
        customerEmail: email,
        customerName: shipping.fullName || "",
        storeName: store.name || "Unknown Store",
        expectedAmountPesewas,
        status: "pending",
        createdAt: admin.firestore.Timestamp.now(),
      });

    const tx = await initializeTransaction({
      email,
      amount: expectedAmountPesewas,
      reference,
      subaccount: subaccountCode,
    });

    return {
      reference,
      accessCode: tx.access_code,
      authorizationUrl: tx.authorization_url,
      amount: expectedAmountPesewas,
    };
  } catch (err) {
    // Paystack initialize (or the intent write) failed after stock was
    // already reserved — release it rather than leaving it stuck
    // decremented with no order ever created.
    await releaseStock(storeId, verifiedItems);
    throw err;
  }
});

// Releases a reservation from initializeOrderPayment — called when the
// customer cancels/closes the Paystack popup, or the client otherwise gives
// up before confirmOrderPayment. Idempotent: only acts if the intent is
// still "pending" (not already consumed by a successful payment, and not
// already cancelled), so a stray double-call can't double-restore stock.
export const cancelOrderPayment = onCall(async (request) => {
  const { reference } = request.data;
  if (!reference) {
    throw new HttpsError("invalid-argument", "Missing reference");
  }

  const db = admin.firestore();
  const intentRef = db.collection("payment_intents").doc(reference);

  const intentToRelease = await db.runTransaction(async (t) => {
    const snap = await t.get(intentRef);
    if (!snap.exists || snap.data()?.status !== "pending") {
      return null;
    }
    t.update(intentRef, { status: "cancelled" });
    return snap.data()!;
  });

  if (intentToRelease) {
    await releaseStock(intentToRelease.storeId, intentToRelease.items);
  }

  return { success: true };
});

// Step 2 of checkout: called right after the Paystack popup's onSuccess
// (mobile/web have no redirect callback to hang a webhook off of). Verifies
// the payment server-side before creating the order — this is the fallback
// confirmation path; paystackWebhook's charge.success handler is the
// primary/authoritative one. Both call the same idempotent helper, so
// whichever fires first wins and the other is a safe no-op.
export const confirmOrderPayment = onCall(async (request) => {
  const { reference } = request.data;
  if (!reference) {
    throw new HttpsError("invalid-argument", "Missing reference");
  }

  const verified = await verifyTransaction(reference);
  const result = await createOrderFromVerifiedPayment({
    reference: verified.reference,
    status: verified.status,
    amount: verified.amount,
    fees_split: verified.fees_split,
  });

  if (!result.created && !result.storeId) {
    throw new HttpsError(
      "failed-precondition",
      "Payment could not be verified"
    );
  }

  return { success: true, storeId: result.storeId };
});

// --- SUBSCRIPTION BILLING (verified, server-side — mirrors the checkout flow) ---

// Step 1: recomputes the price server-side from BILLING_PLANS (never trusts
// a client-supplied amount), uses the authenticated user's real email (not
// a hardcoded placeholder), and starts a plain (non-split — this money goes
// to the platform, not a vendor) Paystack transaction.
export const initializeSubscriptionPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { billingCycle } = request.data;
  const plan = BILLING_PLANS[billingCycle];
  if (!plan) {
    throw new HttpsError("invalid-argument", "Invalid billing cycle");
  }

  const email = request.auth.token.email;
  if (!email) {
    throw new HttpsError(
      "invalid-argument",
      "An email is required to receive a payment receipt"
    );
  }

  const expectedAmountPesewas = Math.round(plan.price * 100);
  const reference = `sub_${crypto.randomBytes(12).toString("hex")}`;

  await admin
    .firestore()
    .collection("subscription_intents")
    .doc(reference)
    .set({
      userId: request.auth.uid,
      billingCycle,
      expectedAmountPesewas,
      status: "pending",
      createdAt: admin.firestore.Timestamp.now(),
    });

  const tx = await initializeTransaction({
    email,
    amount: expectedAmountPesewas,
    reference,
  });

  return {
    reference,
    accessCode: tx.access_code,
    amount: expectedAmountPesewas,
  };
});

// Step 2: called right after the Paystack popup's onSuccess, same
// fast-feedback-fallback role as confirmOrderPayment — paystackWebhook's
// charge.success handler is the primary/authoritative path, both call the
// same idempotent helper.
export const confirmSubscriptionPayment = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { reference } = request.data;
  if (!reference) {
    throw new HttpsError("invalid-argument", "Missing reference");
  }

  const verified = await verifyTransaction(reference);
  const result = await applySubscriptionPaymentIfVerified({
    reference: verified.reference,
    status: verified.status,
    amount: verified.amount,
  });

  if (!result.applied && !result.alreadyConsumed) {
    throw new HttpsError(
      "failed-precondition",
      "Payment could not be verified"
    );
  }

  return { success: true };
});

// Vendor (or their store's owner) triggers a real Paystack refund — full
// or partial — for one of their orders. Only initiates the refund;
// refunded/refundStatus/the vendor's wallet debit only get applied once
// refund.processed confirms it actually completed (see webhooks.ts and
// refunds.ts) — a refund can still fail or land in needs-attention after
// being created.
export const refundOrder = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { storeId, orderId, amount, note } = request.data;
  if (!storeId || !orderId) {
    throw new HttpsError("invalid-argument", "Missing storeId or orderId");
  }
  if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
    throw new HttpsError("invalid-argument", "Invalid refund amount");
  }

  const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
  if (!storeDoc.exists || storeDoc.data()?.ownerId !== request.auth.uid) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to refund orders for this store"
    );
  }

  const orderRef = admin
    .firestore()
    .collection("stores")
    .doc(storeId)
    .collection("orders")
    .doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    throw new HttpsError("not-found", "Order not found");
  }

  return initiateOrderRefund(orderRef, orderDoc.data()!, amount, note);
});

export { paystackWebhook } from "./webhooks";
export { resendWebhook } from "./inbound";
export { migrateToMultiVendor } from "./migrate_to_multi_vendor";
export { checkSubscriptionExpiry };
export { sendPasswordReset } from "./auth";
export * from "./onboarding";
