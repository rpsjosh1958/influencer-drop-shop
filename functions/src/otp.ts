import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { Resend } from "resend";
import * as logger from "firebase-functions/logger";
import { getEmailLayout } from "./email-layout";
import { getErrorMessage } from "./errors";

// Email-OTP gate for sensitive payout changes (adding a payout method for
// the first time, or changing an existing one) — linkPayoutMethod refuses
// to run without a fresh, verified token from this flow. SMS is a planned
// second channel; the doc shape (storeId/code/attempts/expiry) is generic
// enough that adding it later is just another sendXOtp variant writing the
// same collection, not a redesign.
//
// One active OTP session per user (doc id == uid) — a user only ever has
// one payout change in flight at a time, so overwriting on resend is fine
// and keeps the collection self-cleaning.
const OTP_COLLECTION = "payout_otps";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes to enter the code
const OTP_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes to actually save after verifying
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code: string, salt: string) {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

async function assertOwnsStore(uid: string, storeId: string) {
  const storeDoc = await admin.firestore().collection("stores").doc(storeId).get();
  if (!storeDoc.exists || storeDoc.data()?.ownerId !== uid) {
    throw new HttpsError(
      "permission-denied",
      "Not authorized to configure payouts for this store"
    );
  }
}

export const sendPayoutOtp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { storeId } = request.data;
  if (!storeId) {
    throw new HttpsError("invalid-argument", "Missing storeId");
  }

  const uid = request.auth.uid;
  // Always the account's own verified email from the auth token — never a
  // client-supplied address, or this "verification" would just mail the
  // code wherever an attacker asked.
  const email = request.auth.token.email;
  if (!email) {
    throw new HttpsError(
      "failed-precondition",
      "Your account has no verified email on file"
    );
  }

  await assertOwnsStore(uid, storeId);

  const otpRef = admin.firestore().collection(OTP_COLLECTION).doc(uid);
  const existing = await otpRef.get();
  const now = Date.now();
  const lastSentAt = existing.data()?.lastSentAtMs;
  if (lastSentAt && now - lastSentAt < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - (now - lastSentAt)) / 1000);
    throw new HttpsError(
      "resource-exhausted",
      `Please wait ${waitSeconds}s before requesting another code`
    );
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  const salt = crypto.randomBytes(16).toString("hex");

  await otpRef.set({
    storeId,
    salt,
    codeHash: hashCode(code, salt),
    attempts: 0,
    consumed: false,
    verifiedToken: null,
    verifiedTokenExpiresAtMs: null,
    createdAtMs: now,
    expiresAtMs: now + OTP_TTL_MS,
    lastSentAtMs: now,
  });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const content = `
      <p style="font-size: 20px; color: #cccccc; line-height: 1.6; margin-bottom: 30px;">
        Use this code to confirm your payout method change. It expires in 10 minutes.
      </p>
      <div style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #ffffff; background: rgba(255,255,255,0.08); border-radius: 16px; padding: 24px; margin-bottom: 30px;">
        ${code}
      </div>
      <p style="margin-top: 20px; font-size: 13px; color: #666666;">
        Didn't request this? Someone may have your password — change it and contact support.
      </p>
    `;
    const { error } = await resend.emails.send({
      from: "The Drop Security <security@copdrop.io>",
      to: [email],
      subject: `${code} is your payout verification code`,
      html: getEmailLayout(content, "Verify It's You."),
    });
    if (error) {
      logger.error("Resend Error sending payout OTP", error);
      throw new HttpsError("internal", "Failed to send verification email");
    }
  } catch (err) {
    logger.error("Failed to send payout OTP email", err);
    throw new HttpsError("internal", getErrorMessage(err));
  }

  return { success: true, expiresInSeconds: OTP_TTL_MS / 1000 };
});

export const verifyPayoutOtp = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const { storeId, code } = request.data;
  if (!storeId || !code) {
    throw new HttpsError("invalid-argument", "Missing storeId or code");
  }

  const uid = request.auth.uid;
  await assertOwnsStore(uid, storeId);

  const otpRef = admin.firestore().collection(OTP_COLLECTION).doc(uid);
  const snap = await otpRef.get();
  const data = snap.data();

  if (!data || data.storeId !== storeId || data.consumed) {
    throw new HttpsError(
      "failed-precondition",
      "No pending code for this store — request a new one"
    );
  }
  if (Date.now() > data.expiresAtMs) {
    throw new HttpsError("deadline-exceeded", "Code expired — request a new one");
  }
  if (data.attempts >= MAX_ATTEMPTS) {
    throw new HttpsError(
      "resource-exhausted",
      "Too many incorrect attempts — request a new code"
    );
  }

  const candidateHash = hashCode(String(code), data.salt);
  const matches =
    candidateHash.length === data.codeHash.length &&
    crypto.timingSafeEqual(Buffer.from(candidateHash), Buffer.from(data.codeHash));

  if (!matches) {
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    throw new HttpsError("invalid-argument", "Incorrect code");
  }

  const verifiedToken = crypto.randomBytes(24).toString("hex");
  const now = Date.now();
  await otpRef.update({
    consumed: true,
    verifiedToken,
    verifiedTokenExpiresAtMs: now + OTP_TOKEN_TTL_MS,
  });

  return { otpToken: verifiedToken };
});

// Shared by linkPayoutMethod — throws unless `otpToken` is a live, unused
// token from a just-completed verifyPayoutOtp for this exact uid/store.
// Consumes it (deletes the doc) on success so it can't be replayed.
export async function assertValidPayoutOtp(
  uid: string,
  storeId: string,
  otpToken: string | undefined
) {
  if (!otpToken) {
    throw new HttpsError(
      "failed-precondition",
      "Email verification required before saving a payout method"
    );
  }

  const otpRef = admin.firestore().collection(OTP_COLLECTION).doc(uid);
  const snap = await otpRef.get();
  const data = snap.data();

  if (
    !data ||
    !data.consumed ||
    data.storeId !== storeId ||
    data.verifiedToken !== otpToken ||
    !data.verifiedTokenExpiresAtMs ||
    Date.now() > data.verifiedTokenExpiresAtMs
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Verification expired — please request and enter a new code"
    );
  }

  await otpRef.delete();
}
