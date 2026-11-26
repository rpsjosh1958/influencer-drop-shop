import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { Resend } from "resend";
import * as logger from "firebase-functions/logger";
import { getErrorCode } from "./errors";
import { getEmailLayout, emailButton, escapeHtml } from "./email-layout";

// Sites a reset link may point at. The caller's `origin` is untrusted (this
// callable needs no login): taken as-is, anyone could have us email a real
// reset code from security@copdrop.io inside a link to their own site.
const ALLOWED_ORIGINS = [
  "https://copdrop.io",
  "https://www.copdrop.io",
  "http://localhost:3000",
];
const RESEND_COOLDOWN_MS = 60 * 1000;

export const buildResetLink = (
  oobCode: string,
  origin: unknown,
  userType: unknown,
  storeId: unknown
) => {
  const base = ALLOWED_ORIGINS.includes(origin as string)
    ? (origin as string)
    : "https://copdrop.io";
  const type = userType === "customer" ? "customer" : "vendor";
  let link = `${base}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}&type=${type}`;
  if (typeof storeId === "string" && storeId) {
    link += `&storeId=${encodeURIComponent(storeId)}`;
  }
  return link;
};

export const sendPasswordReset = onCall(async (request) => {
  const { email, userType, storeId, origin } = request.data; // userType: 'vendor' | 'customer'

  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError("invalid-argument", "Email is required");
  }

  // One email per address per minute — without a login gate, nothing else
  // stops someone flooding an inbox with our security emails. Answers
  // "sent" either way so it reveals nothing.
  const limitRef = admin
    .firestore()
    .collection("password_reset_requests")
    .doc(crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex"));
  const lastSentAtMs = (await limitRef.get()).data()?.lastSentAtMs;
  if (lastSentAtMs && Date.now() - lastSentAtMs < RESEND_COOLDOWN_MS) {
    return { success: true };
  }
  await limitRef.set({ lastSentAtMs: Date.now() });

  try {
    // Throws auth/user-not-found for an unknown address (handled below).
    // Needed up front: generatePasswordResetLink can't tell us — with email
    // enumeration protection on, it just fails with auth/internal-error.
    await admin.auth().getUserByEmail(email);

    // Firebase generates the one-time code; we send our own branded email
    // with a link to our own /auth/action page instead of Firebase's.
    const firebaseLink = await admin.auth().generatePasswordResetLink(email);
    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    if (!oobCode) {
      throw new Error("Failed to extract reset code");
    }

    const accountType = userType === "customer" ? "customer" : "vendor";
    const resetContent = `
      <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 30px;">
        We received a request to reset the password for your <strong>${accountType}</strong> account associated with <strong>${escapeHtml(email)}</strong>.
      </p>

      ${emailButton(buildResetLink(oobCode, origin, userType, storeId), "Reset Password")}

      <p style="margin-top: 40px; font-size: 13px; color: #666666;">
        If you didn't ask for this, you can ignore this email — your password will not be changed.
      </p>
    `;

    const resend = new Resend(process.env.RESEND_API_KEY);
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
    // Same answer whether or not the address has an account, so this
    // can't be used to find out who's registered.
    const code = getErrorCode(err);
    if (code === "auth/user-not-found") {
      return { success: true };
    }
    if (code === "auth/invalid-email") {
      throw new HttpsError("invalid-argument", "Enter a valid email address.");
    }
    logger.error("Password reset failed", err);
    throw new HttpsError("internal", "Failed to send reset email. Try again shortly.");
  }
});
