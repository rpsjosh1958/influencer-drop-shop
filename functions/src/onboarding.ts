import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { Resend } from "resend";

const LOGO_URL = "https://copdrop.io/assets/landing/drop_logo.svg";

/**
 * Reusable email wrapper style
 */
const getEmailLayout = (content: string, title: string = "Own The Hype.") => `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #000000; color: #ffffff; padding: 60px 20px; text-align: center;">
    <div style="max-width: 600px; margin: 0 auto;">
      <img src="${LOGO_URL}" alt="THE DROP" style="width: 80px; height: 80px; margin-bottom: 20px;" />
      <h1 style="font-size: 48px; font-weight: 900; margin-bottom: 10px; letter-spacing: -2px; color: #ffffff;">${title}</h1>
      <div style="width: 50px; height: 4px; background: linear-gradient(90deg, #A855F7, #EC4899, #F97316); margin: 0 auto 30px;"></div>
      
      ${content}

      <p style="margin-top: 60px; font-size: 12px; color: #666666;">
        © 2026 THE DROP. • Accra, Ghana
      </p>
    </div>
  </div>
`;

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
        to: ["tettehjosh5@gmail.com"],
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

      // 2. Email to Vendor (Pending Review) - Using the Welcome Style
      const reviewingContent = `
        <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 20px;">
          Hi <strong>${user.fullName || "Creator"}</strong>,<br/><br/>
          Your store <strong>${store.name}</strong> is currently under review by our compliance team.
        </p>
        <p style="font-size: 16px; color: #999999; line-height: 1.6; margin-bottom: 30px;">
          We're checking your details and verification documents to ensure a smooth launch. You'll be notified as soon as your store is approved or if we need more information.
        </p>
        <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; margin-bottom: 40px; text-align: left; border: 1px solid #333;">
          <h3 style="margin-top: 0; margin-bottom: 15px; color: #ffffff;">While you wait:</h3>
          <p style="color: #cccccc; font-size: 14px; margin-bottom: 10px;">You can still log into your dashboard to:</p>
          <ul style="color: #ccc; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Complete your store profile</li>
            <li style="margin-bottom: 8px;">Add your first products or services</li>
            <li style="margin-bottom: 8px;">Customize your store theme</li>
          </ul>
        </div>
        <a href="https://copdrop.io/admin" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px;">
          Go to Dashboard
        </a>
      `;

      await resend.emails.send({
        from: "The Drop <onboarding@copdrop.io>",
        to: [user.email],
        subject: `Building your brand on THE DROP`,
        html: getEmailLayout(reviewingContent, "Building your brand."),
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

    // 1. Handle onboardingStatus changes
    if (before.onboardingStatus !== after.onboardingStatus) {
      const db = admin.firestore();
      const userDoc = await db.collection("users").doc(after.ownerId).get();
      const user = userDoc.data();
      if (!user || !user.email) return;

      const resend = new Resend(process.env.RESEND_API_KEY);
      let subject = "";
      let title = "";
      let content = "";

      if (after.onboardingStatus === "approved") {
        subject = `Your store "${after.name}" is APPROVED! 🎉`;
        title = "Own The Hype.";
        
        // Merged Welcome + Approved Content
        content = `
          <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 20px;">
            Hi <strong>${user.fullName || "Creator"}</strong>,<br/><br/>
            Great news! Your store <strong>${after.name}</strong> has been approved.
          </p>

          ${after.isTrial ? `
          <div style="background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 40px; border: 1px solid #333;">
            <p style="font-size: 16px; color: #fff; margin: 0;">
              🎁 <strong>You've unlocked a 30-Day Free Trial of Growth Plan.</strong><br/>
              <span style="color: #999; font-size: 14px;">Enjoy a reduction to 2% platform fees, verified badge eligibility, and mobile app store visibilty.</span>
            </p>
          </div>
          ` : ""}

          <div style="background: rgba(255,255,255,0.1); border-radius: 16px; padding: 30px; margin-bottom: 40px; text-align: left; border: 1px solid #333;">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #ffffff;">Your Launch Checklist:</h3>
            <ul style="color: #ccc; padding-left: 20px;">
              <li style="margin-bottom: 10px;">Login to your Dashboard: <strong>copdrop.io/admin</strong></li>
              <li style="margin-bottom: 10px;">Add your first Product</li>
              <li style="margin-bottom: 10px;">Share your link: <strong>copdrop.io/shop/${after.slug}</strong></li>
            </ul>
          </div>

          <a href="https://copdrop.io/admin" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px;">
            Launch Store
          </a>
        `;
      } else if (after.onboardingStatus === "needs_more_info") {
        subject = `Action Required: Your store "${after.name}" needs more info`;
        title = "Almost There.";
        content = `
          <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 20px;">
            Hi <strong>${user.fullName || "Creator"}</strong>,<br/><br/>
            Our team reviewed your store application and needs a bit more information before we can approve it.
          </p>
          <div style="background: rgba(255,191,0,0.1); border: 1px solid #FFBF00; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;">
              <p style="margin: 0; font-weight: bold; color: #FFBF00;">Admin Note:</p>
              <p style="margin: 10px 0; color: #ffffff;">${after.onboardingNotes || "Please review your profile and documents."}</p>
          </div>
          <p style="color: #999999; margin-bottom: 30px;">Please log in to your dashboard to update your information.</p>
          <a href="https://copdrop.io/admin/settings" style="display: inline-block; background-color: #ffffff; color: #000000; padding: 18px 40px; border-radius: 50px; text-decoration: none; font-weight: 900; font-size: 16px;">
            Update Profile
          </a>
        `;
      } else if (after.onboardingStatus === "rejected") {
        subject = `Update regarding your store "${after.name}"`;
        title = "Application Update.";
        content = `
          <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 20px;">
            Hi <strong>${user.fullName || "there"}</strong>,<br/><br/>
            We regret to inform you that your application for <strong>${after.name}</strong> has been rejected at this time.
          </p>
          <div style="background: rgba(255,0,0,0.1); border: 1px solid #FF0000; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: left;">
              <p style="margin: 0; font-weight: bold; color: #FF0000;">Reason:</p>
              <p style="margin: 10px 0; color: #ffffff;">${after.onboardingNotes || "Your store does not meet our current requirements."}</p>
          </div>
          <p style="color: #999999; margin-bottom: 30px;">If you have questions, please contact our support team.</p>
        `;
      }

      if (subject && content) {
        await resend.emails.send({
          from: "The Drop Onboarding <onboarding@copdrop.io>",
          to: [user.email],
          subject,
          html: getEmailLayout(content, title),
        });
        logger.info(`Status update email (${after.onboardingStatus}) sent to ${user.email}`);
      }
    }
  }
);
