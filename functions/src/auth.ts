import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { Resend } from "resend";
import * as logger from "firebase-functions/logger";
import { getErrorCode, getErrorMessage } from "./errors";
import { getEmailLayout, emailButton } from "./email-layout";

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

    const resetContent = `
      <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 30px;">
        We received a request to reset the password for your <strong>${userType || "vendor"}</strong> account associated with <strong>${email}</strong>.
      </p>

      ${emailButton(customLink, "Reset Password")}

      <p style="margin-top: 40px; font-size: 13px; color: #666666;">
        If you didn't ask for this, you can ignore this email — your password will not be changed.
      </p>
    `;

    const { error } = await resend.emails.send({
      from: "The Drop Security <security@copdrop.io>",
      to: [email],
      subject: "Reset your password",
      html: getEmailLayout(resetContent, "Reset Request."),
    });

    if (error) {
      logger.error("Resend Error", error);
      throw new HttpsError("internal", "Failed to send email");
    }

    return { success: true };
  } catch (err) {
    logger.error("Password reset failed", err);
    // Return success to prevent email enumeration if user not found?
    // User enumeration is a risk, but for now we might want detailed errors for debugging.
    if (getErrorCode(err) === "auth/user-not-found") {
      throw new HttpsError("not-found", "No user found with this email.");
    }
    throw new HttpsError("internal", getErrorMessage(err));
  }
});
