import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isThisYear, isToday, isTomorrow, isYesterday } from "date-fns";
import type { FirestoreTimestampLike } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Reads a `FirestoreTimestampLike` value as a JS Date. Returns null for a
 * `FieldValue` sentinel (an unwritten `serverTimestamp()`, which has no
 * resolvable value client-side) or anything unrecognized.
 */
export function toJsDate(
  value: FirestoreTimestampLike | number | undefined | null,
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  if (typeof value === "object" && "seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

/** Raw Unix seconds from a `FirestoreTimestampLike`, for sort comparisons. */
export function getTimestampSeconds(
  value: FirestoreTimestampLike | number | undefined | null,
): number {
  const date = toJsDate(value);
  return date ? Math.floor(date.getTime() / 1000) : 0;
}

/**
 * Day header for date-grouped lists ("Today", "Yesterday", "Sep 12"),
 * matching the mobile app's grouped order/activity lists.
 */
export function getDateGroupLabel(date: Date | null): string {
  if (!date || isNaN(date.getTime())) return "Unknown";
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, isThisYear(date) ? "MMM d" : "MMM d, yyyy");
}

/**
 * Splits an already-sorted list into consecutive same-day runs, keeping the
 * list's own order (so pagination/limits still apply before grouping).
 */
export function groupByDate<T>(
  items: T[],
  getDate: (item: T) => Date | null,
): { label: string; items: T[] }[] {
  const groups: { label: string; items: T[] }[] = [];
  items.forEach((item) => {
    const label = getDateGroupLabel(getDate(item));
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) lastGroup.items.push(item);
    else groups.push({ label, items: [item] });
  });
  return groups;
}

/**
 * "2:05 PM"-style time for rows that already sit under a date header.
 * Always 12-hour — the browser's locale (e.g. en-GB) would otherwise show 14:05.
 */
export function formatTimeOfDay(date: Date | null): string {
  return date && !isNaN(date.getTime()) ? format(date, "h:mm a") : "";
}

/** A stored "HH:mm" booking/slot time ("14:30") as 12-hour ("2:30 PM"). */
export function formatClockTime(time?: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return time;
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Formats a number as GHS currency with commas and 2 decimal places.
 */
export function formatCurrency(amount: number | string) {
  const val = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(val)) return "GHS 0.00";
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(val);
}

/**
 * Formats a number with commas and standard decimal places.
 */
export function formatNumber(num: number | string, decimals = 0) {
  const val = typeof num === "string" ? parseFloat(num) : num;
  if (isNaN(val)) return "0";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

/**
 * Picks black or white text for readability against an arbitrary hex
 * background (YIQ brightness formula) — used for vendor-chosen colors
 * (e.g. the announcement banner) where we don't want to also make them
 * pick a matching text color.
 */
export function getContrastTextColor(hex: string): "#000000" | "#ffffff" {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean.split("").map((c) => c + c).join("")
      : clean;
  const num = parseInt(full, 16);
  if (isNaN(num) || full.length !== 6) return "#000000";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}

// Fixed-length mask ("d*****4@gmail.com") so on-screen prompts don't expose the address or its length.
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "your email";
  const at = email.lastIndexOf("@");
  if (at <= 0) return "your email";
  const local = email.slice(0, at);
  const masked =
    local.length <= 2
      ? `${local[0]}*****`
      : `${local[0]}*****${local[local.length - 1]}`;
  return `${masked}${email.slice(at)}`;
}
