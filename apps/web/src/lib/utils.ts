import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
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
