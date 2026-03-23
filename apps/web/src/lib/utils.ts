import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
