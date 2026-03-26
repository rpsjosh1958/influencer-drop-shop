import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Resend } from "resend";

/*
 * TRIGGER: When a new Store is created
 * ACTION: Notify Super Admin and Send "Review Pending" email to Vendor
 */
export const onStoreOnboardingCreated = onDocumentCreated(
  "stores/{storeId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const store = snapshot.data();
    const storeId = event.params.storeId;
    const ownerId = store.ownerId;

    if (!ownerId) return;

    try {
      const db = admin.firestore();
      
      // Fetch Owner Data
      const userDoc = await db.collection("users").doc(ownerId).get();
      const user = userDoc.data();

      if (!user || !user.email) {
        logger.warn(`Owner ${ownerId} not found or has no email.`);
        return;
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      // 1. Email to Super Admin
      await resend.emails.send({
        from: "The Drop Compliance <compliance@copdrop.io>",
        to: ["compliance@copdrop.io"], // Replace with actual super-admin email if different
        subject: `New Vendor Pending Approval: ${store.name}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>New Store Review Required</h2>
            <p><strong>Store Name:</strong> ${store.name}</p>
            <p><strong>Store Slug:</strong> ${store.slug}</p>
            <p><strong>Vendor Name:</strong> ${user.fullName || "N/A"}</p>
            <p><strong>Vendor Type:</strong> ${user.vendorType || "individual"}</p>
            <p><strong>Vendor Email:</strong> ${user.email}</p>
            <hr />
            <a href="https://copdrop.io/super-admin/vendors?storeId=${storeId}" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Store</a>
          </div>
        `,
      });

      // 2. Email to Vendor (Pending Review)
      await resend.emails.send({
        from: "The Drop <onboarding@copdrop.io>",
        to: [user.email],
        subject: `We're reviewing your store on THE DROP`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #000;">Building your brand.</h1>
            <p>Hi ${user.fullName || "there"},</p>
            <p>Your store <strong>${store.name}</strong> has been created and is now under review by our compliance team.</p>
            <p>We'll check your details and verification documents to ensure everything is set for a successful launch. You'll receive another email from us once your store is approved or if we need more information.</p>
            <div style="background: #f4f4f5; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0;"><strong>What's next?</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">While you wait, you can log into your dashboard to complete your profile, add products, and set up your theme.</p>
            </div>
            <a href="https://copdrop.io/admin" style="display: inline-block; background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
            <p style="margin-top: 30px; font-size: 12px; color: #666;">© 2026 THE DROP. Accra, Ghana</p>
          </div>
        `,
      });

      logger.info(`Onboarding emails sent for store ${storeId}`);
    } catch (err) {
      logger.error("Failed to execute onStoreOnboardingCreated", err);
    }
  }
);

/*
 * TRIGGER: When Store document is updated
 * ACTION: Send approval/rejection/info-request emails to Vendor
 */
export const onStoreOnboardingUpdated = onDocumentUpdated(
  "stores/{storeId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const before = snapshot.before.data();
    const after = snapshot.after.data();
    // const storeId = event.params.storeId;

    // 1. Handle onboardingStatus changes
    if (before.onboardingStatus !== after.onboardingStatus) {
      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(after.ownerId).get();
      const user = userDoc.data();
      if (!user || !user.email) return;

      const resend = new Resend(process.env.RESEND_API_KEY);
      let subject = "";
      let html = "";

      if (after.onboardingStatus === "approved") {
        subject = `Your store "${after.name}" is APPROVED! 🎉`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h1 style="color: #000;">You're Live!</h1>
            <p>Great news ${user.fullName || "there"},</p>
            <p>Your store <strong>${after.name}</strong> has been approved. You can now set your store to <strong>LIVE</strong> from your dashboard and start accepting orders.</p>
            <a href="https://copdrop.io/admin" style="display: inline-block; background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Launch Store</a>
          </div>
        `;
      } else if (after.onboardingStatus === "needs_more_info") {
        subject = `Action Required: Your store "${after.name}" needs more info`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #000;">Clarification Needed</h2>
            <p>Hi ${user.fullName || "there"},</p>
            <p>Our team reviewed your store and needs a bit more information before we can approve it:</p>
            <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Admin Note:</p>
                <p style="margin: 5px 0;">${after.onboardingNotes || "Please review your profile and documents."}</p>
            </div>
            <p>Please log in to your dashboard to update your information.</p>
            <a href="https://copdrop.io/admin/settings" style="display: inline-block; background: #000; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Update Settings</a>
          </div>
        `;
      } else if (after.onboardingStatus === "rejected") {
        subject = `Update regarding your store "${after.name}"`;
        html = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #000;">Application Update</h2>
            <p>Hi ${user.fullName || "there"},</p>
            <p>We regret to inform you that your application for <strong>${after.name}</strong> has been rejected at this time.</p>
            <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 0; font-weight: bold;">Reason:</p>
                <p style="margin: 5px 0;">${after.onboardingNotes || "Your store does not meet our current requirements."}</p>
            </div>
            <p>If you have questions, please contact our support team.</p>
          </div>
        `;
      }

      if (subject && html) {
        await resend.emails.send({
          from: "The Drop Onboarding <onboarding@copdrop.io>",
          to: [user.email],
          subject,
          html,
        });
        logger.info(`Status update email (${after.onboardingStatus}) sent to ${user.email}`);
      }
    }

    // 2. Handle isSuspended changes
    if (before.isSuspended !== after.isSuspended) {
      // Optional: Add suspension emails here
    }
  }
);
