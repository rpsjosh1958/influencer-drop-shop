import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Picks black or white text for readability against an arbitrary hex
 * background (YIQ brightness formula) — mirrors
 * apps/web/src/lib/utils.ts's getContrastTextColor, used for the
 * vendor-chosen announcement banner color.
 */
export function getContrastTextColor(hex: string): "#000000" | "#ffffff" {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (isNaN(num) || full.length !== 6) return "#000000";
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000000" : "#ffffff";
}
