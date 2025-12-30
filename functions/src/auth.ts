import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import * as logger from "firebase-functions/logger";

export const sendPasswordReset = onCall(async (request) => {
  const { email, userType, storeId, origin } = request.data; // userType: 'vendor' | 'customer'

  if (!email) {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  try {
    // 1. Generate Reset Link (Firebase hosted)
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);

    // 2. Extract oobCode to build Custom Link
    const urlObj = new URL(firebaseLink);
    const oobCode = urlObj.searchParams.get("oobCode");

    if (!oobCode) {
      throw new Error("Failed to extract reset code");
    }

    // 3. Construct Custom Action Link
    // Fallback to prod URL if origin not provided (e.g. mobile app call?)
    const baseUrl = origin || "https://copdrop.io";
    let customLink = `${baseUrl}/auth/action?mode=resetPassword&oobCode=${oobCode}&type=${
      userType || "vendor"
    }`;
    if (storeId) {
      customLink += `&storeId=${storeId}`;
    }

    // 4. Send Email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error } = await resend.emails.send({
      from: "The Drop Security <security@copdrop.io>",
      to: [email],
      subject: "Reset your password",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; padding: 40px 20px; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 20px; color: #000;">Reset Request</h1>
            <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 30px;">
              We received a request to reset the password for your <strong>${userType}</strong> account associated with <strong>${email}</strong>.
            </p>
            
            <a href="${customLink}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 15px 30px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>

            <p style="margin-top: 30px; font-size: 12px; color: #999;">
              If you didn't ask for this, you can ignore this email. Your password will not be changed.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      logger.error("Resend Error", error);
      throw new HttpsError("internal", "Failed to send email");
    }

    return { success: true };
  } catch (err: any) {
    logger.error("Password reset failed", err);
    // Return success to prevent email enumeration if user not found?
    // User enumeration is a risk, but for now we might want detailed errors for debugging.
    if (err.code === "auth/user-not-found") {
      throw new HttpsError("not-found", "No user found with this email.");
    }
    throw new HttpsError("internal", err.message);
  }
});
