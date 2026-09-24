import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

export const SUPPORT_EMAIL = "support@copdrop.io";

// Pages on the web app (apps/web/src/app/{privacy,terms,delete-account}).
export const LEGAL_URLS = {
  privacy: "https://copdrop.io/privacy",
  terms: "https://copdrop.io/terms",
  deleteAccount: "https://copdrop.io/delete-account",
};

// In-app browser, so reading a policy doesn't bounce people out of the app.
export const openWebPage = (url: string) => WebBrowser.openBrowserAsync(url);

/** Resolves false instead of throwing when nothing can handle the URL (e.g. no mail app). */
export async function openUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function supportEmailUrl(subject: string, accountEmail?: string | null) {
  const body = accountEmail ? `\n\n—\nAccount: ${accountEmail}` : "";
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * The storefront footer's "Contact Email" field (web settings) often holds a
 * phone number instead, so link whichever it looks like.
 */
export function footerContactUrl(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return `mailto:${trimmed}`;
  const dialable = trimmed.replace(/[^\d+]/g, "");
  if (dialable.replace(/\D/g, "").length >= 7) return `tel:${dialable}`;
  return null;
}

export function mapsUrl(address: string) {
  const query = encodeURIComponent(address.trim());
  return Platform.OS === "ios"
    ? `https://maps.apple.com/?q=${query}`
    : `geo:0,0?q=${query}`;
}

/** Vendors enter "@handle" (per the web placeholder) or sometimes a full URL. */
export function socialProfileUrl(network: "instagram" | "twitter", value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@/, "");
  return network === "instagram"
    ? `https://instagram.com/${handle}`
    : `https://x.com/${handle}`;
}
