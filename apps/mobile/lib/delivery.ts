export interface DeliveryInfo {
  days?: string[];
  estimate?: string;
}

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKEND = ["sat", "sun"];
const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<string, string> = {
  mon: "Mondays",
  tue: "Tuesdays",
  wed: "Wednesdays",
  thu: "Thursdays",
  fri: "Fridays",
  sat: "Saturdays",
  sun: "Sundays",
};

function sameDays(a: string[], b: string[]): boolean {
  return a.length === b.length && b.every((d) => a.includes(d));
}

function formatDeliveryDays(days: string[]): string | null {
  if (days.length === 0) return null;
  if (sameDays(days, ALL_DAYS)) return "Delivers every day";
  if (sameDays(days, WEEKDAYS)) return "Delivers weekdays only";
  if (sameDays(days, WEEKEND)) return "Delivers weekends only";
  if (days.length === 1) return `Delivers ${DAY_LABEL[days[0]]} only`;
  return `Delivers on ${days.map((d) => DAY_LABEL[d]?.replace(/s$/, "")).join(", ")}`;
}

// Combines the store's two independent, optional delivery fields into one
// short line for buyers. Returns "" when neither is set, so callers can
// skip rendering anything instead of showing a fake/default claim. Mirrors
// apps/web/src/lib/delivery.ts — no shared package between apps/web and
// apps/mobile, kept in sync by hand.
export function formatDeliveryInfo(delivery: DeliveryInfo | null | undefined): string {
  const days = delivery?.days || [];
  const estimate = delivery?.estimate?.trim();
  const daysText = formatDeliveryDays(days);

  if (daysText && estimate) return `${estimate} · ${daysText}`;
  if (estimate) return estimate;
  if (daysText) return daysText;
  return "";
}
