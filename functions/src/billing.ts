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
