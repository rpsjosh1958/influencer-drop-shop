import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { extendGrowthExpiry, formatPlanDate } from "./billing";
import { sendNotificationToUser } from "./notifications";

// Vendor referrals: a new vendor enters another vendor's code at signup
// (create-store), and when the new vendor's first store is approved both
// get REFERRAL_REWARD_DAYS of Growth on top of whatever they have. The
// reward waits for approval because signup is self-serve — KYC review is
// what stops someone farming months with throwaway accounts.
//
// All state lives in two server-only collections (no rules entry, so
// clients can't read or write them):
//   referral_codes/{CODE}             -> { uid, rewardedCount }
//   referral_redemptions/{refereeUid} -> { code, referrerUid, status }
// Keying redemptions by auth uid, not a user-doc field, means "one code per
// vendor" can't be reset by editing the user doc.

export const REFERRAL_REWARD_DAYS = 30;
// No O/0/I/1/L: codes get read off flyers and typed on phones.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export const normalizeReferralCode = (raw: unknown) =>
  typeof raw === "string" ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";

// Has this owner been through review already? Decides who counts as a "new
// vendor" for referrals and whose extra stores get auto-approved
// (onStoreCreated). Stores with no onboardingStatus predate review and
// count as approved, same as firestore.rules and initializeOrderPayment.
export const ownerHasApprovedStore = async (
  ownerId: string,
  exceptStoreId?: string
) => {
  const stores = await admin
    .firestore()
    .collection("stores")
    .where("ownerId", "==", ownerId)
    .get();
  return stores.docs.some(
    (d) =>
      d.id !== exceptStoreId &&
      (d.data().onboardingStatus ?? "approved") === "approved"
  );
};

const randomCode = () =>
  Array.from(
    { length: CODE_LENGTH },
    () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  ).join("");

// Returns the caller's code, minting one on first ask (so existing vendors
// get one without a backfill). ponytail: two simultaneous first calls can
// mint two codes for one vendor — both map to them and both work.
export const getReferralCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const uid = request.auth.uid;
  const db = admin.firestore();
  const codes = db.collection("referral_codes");

  const existing = await codes.where("uid", "==", uid).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    return { code: doc.id, rewardedCount: doc.data().rewardedCount || 0 };
  }

  const stores = await db
    .collection("stores")
    .where("ownerId", "==", uid)
    .limit(1)
    .get();
  if (stores.empty) {
    throw new HttpsError("failed-precondition", "Only vendors have a referral code");
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const ref = codes.doc(code);
    const created = await db.runTransaction(async (t) => {
      if ((await t.get(ref)).exists) return false;
      t.create(ref, {
        uid,
        rewardedCount: 0,
        createdAt: admin.firestore.Timestamp.now(),
      });
      return true;
    });
    if (created) return { code, rewardedCount: 0 };
  }
  throw new HttpsError("internal", "Couldn't create a referral code, try again");
});

// Called by create-store before the store is written, so a bad code is
// caught while the vendor can still fix it. Only records the redemption —
// the reward itself lands in rewardReferralOnApproval.
export const redeemReferralCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be logged in");
  }
  const uid = request.auth.uid;
  const code = normalizeReferralCode(request.data?.code);
  const db = admin.firestore();

  const codeSnap =
    code.length === CODE_LENGTH
      ? await db.collection("referral_codes").doc(code).get()
      : null;
  const referrerUid = codeSnap?.data()?.uid;
  if (!referrerUid) {
    throw new HttpsError("not-found", "That referral code isn't valid");
  }
  if (referrerUid === uid) {
    throw new HttpsError("failed-precondition", "You can't use your own referral code");
  }

  if (await ownerHasApprovedStore(uid)) {
    throw new HttpsError(
      "failed-precondition",
      "Referral codes are only for new vendors"
    );
  }

  const redemptionRef = db.collection("referral_redemptions").doc(uid);
  await db.runTransaction(async (t) => {
    const snap = await t.get(redemptionRef);
    if (snap.exists) {
      // Same code again = a retried signup (e.g. the store URL was taken).
      if (snap.data()?.code === code) return;
      throw new HttpsError("already-exists", "You've already used a referral code");
    }
    t.create(redemptionRef, {
      code,
      referrerUid,
      status: "pending",
      createdAt: admin.firestore.Timestamp.now(),
    });
  });

  return { success: true };
});

// Called from onStoreOnboardingUpdated when one of the referee's stores is
// approved. The status flip inside the transaction makes it pay out once,
// however many stores get approved or however often the trigger retries.
export const rewardReferralOnApproval = async (
  refereeUid: string,
  storeName: string
): Promise<boolean> => {
  const db = admin.firestore();
  const redemptionRef = db.collection("referral_redemptions").doc(refereeUid);

  const result = await db.runTransaction(async (t) => {
    const redemption = (await t.get(redemptionRef)).data();
    if (!redemption || redemption.status !== "pending") return null;

    const refereeRef = db.collection("users").doc(refereeUid);
    const referrerRef = db.collection("users").doc(redemption.referrerUid);
    const [referee, referrer] = await t.getAll(refereeRef, referrerRef);
    if (!referee.exists) return null;

    const now = admin.firestore.Timestamp.now();
    const grant = (
      userRef: admin.firestore.DocumentReference,
      user: admin.firestore.DocumentData | undefined
    ) => {
      const newExpiresAt = extendGrowthExpiry(user, REFERRAL_REWARD_DAYS, now);
      t.update(userRef, { plan: "growth", planExpiresAt: newExpiresAt });
      t.set(db.collection("plan_grants").doc(), {
        source: "referral",
        userId: userRef.id,
        days: REFERRAL_REWARD_DAYS,
        note: `Referral: ${refereeUid} used code ${redemption.code}`,
        previousPlan: user?.plan || "starter",
        previousExpiresAt: user?.planExpiresAt || null,
        newExpiresAt,
        createdAt: now,
      });
      return newExpiresAt;
    };

    const refereeUntil = grant(refereeRef, referee.data());
    // A deleted referrer just forfeits their half.
    const referrerUntil = referrer.exists
      ? grant(referrerRef, referrer.data())
      : null;
    if (referrerUntil) {
      t.update(db.collection("referral_codes").doc(redemption.code), {
        rewardedCount: admin.firestore.FieldValue.increment(1),
      });
    }
    t.update(redemptionRef, { status: "rewarded", rewardedAt: now });

    return { referrerUid: redemption.referrerUid as string, refereeUntil, referrerUntil };
  });

  if (!result) return false;
  logger.info(`Referral rewarded: ${refereeUid} (referred by ${result.referrerUid})`);

  await sendNotificationToUser(
    refereeUid,
    "Referral bonus unlocked 🎁",
    `Your referral code added ${REFERRAL_REWARD_DAYS} days of Growth. You're on Growth until ${formatPlanDate(result.refereeUntil)}.`,
    "referral_reward",
    { screen: "/(vendor)/billing" }
  );
  if (result.referrerUntil) {
    await sendNotificationToUser(
      result.referrerUid,
      "Your referral paid off 🎉",
      `${storeName} was just approved with your code, so you get ${REFERRAL_REWARD_DAYS} more days of Growth. You're on Growth until ${formatPlanDate(result.referrerUntil)}.`,
      "referral_reward",
      { screen: "/(vendor)/billing" }
    );
  }
  return true;
};
