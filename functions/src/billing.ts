import * as admin from "firebase-admin";

// Server-side mirror of apps/web's BILLING_PLANS
// (apps/web/src/app/(admin)/admin/settings/page.tsx). Keep these in sync —
// this is the source of truth actually charged; the web copy is display-only.
export const BILLING_PLANS: Record<
  string,
  { label: string; price: number; days: number }
> = {
  monthly: { label: "Monthly", price: 250, days: 30 },
  quarterly: { label: "Quarterly (3 Months)", price: 700, days: 90 },
  annual: { label: "Annual (12 Months)", price: 2500, days: 365 },
};

// Every Growth grant (payment, referral, admin gift) goes through this: days
// are added on top of whatever Growth time is still left, never restarted
// from now — so a trial or an earlier grant is extended, not overwritten.
export const extendGrowthExpiry = (
  user: { plan?: string; planExpiresAt?: admin.firestore.Timestamp } | undefined,
  days: number,
  now: admin.firestore.Timestamp = admin.firestore.Timestamp.now()
): admin.firestore.Timestamp => {
  const current = user?.plan === "growth" ? user.planExpiresAt : undefined;
  const base = current && current.seconds > now.seconds ? current : now;
  return new admin.firestore.Timestamp(
    base.seconds + days * 24 * 60 * 60,
    base.nanoseconds
  );
};

// "29 Oct 2026" — how plan expiry dates read in vendor notifications.
export const formatPlanDate = (ts: admin.firestore.Timestamp) =>
  ts.toDate().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Accra",
  });
