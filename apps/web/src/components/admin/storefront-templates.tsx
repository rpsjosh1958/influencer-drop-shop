"use client";

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Check, ShoppingBag } from "lucide-react";
import { db } from "@/lib/firebase";
import { formatCurrency, storefrontColorVars } from "@/lib/utils";
import type { Product, StoreConfig } from "@/types";

type Theme = NonNullable<StoreConfig["theme"]>;

export interface StoreTemplate {
  id: string;
  name: string;
  bestFor: string;
  backgroundColor: string;
  surfaceColor: string; // product/service card tiles
  primaryColor: string; // text
  accentColor: string; // card buttons; text on it is worked out by getContrastTextColor
  fontFamily: string; // body
  headlineFont: string;
  uppercase: boolean;
  layout: "left" | "center";
}

// Palettes adapted from coolors.co/palettes/trending (Nov 2026). Every text,
// card-description and button pair clears WCAG AA (4.5:1). Body fonts stay
// inside the mobile app's font list (apps/mobile/lib/font-map.ts) so a store
// reads the same in the app; headline fonts are web-only (mobile's hero uses
// the body font).
export const STORE_TEMPLATES: StoreTemplate[] = [
  { id: "clean", name: "Clean", bestFor: "Any store",
    backgroundColor: "#FFFFFF", surfaceColor: "#F4F4F5", primaryColor: "#111111", accentColor: "#111111",
    fontFamily: "Inter", headlineFont: "Inter", uppercase: false, layout: "left" },
  { id: "street", name: "Street", bestFor: "Sneakers, streetwear",
    backgroundColor: "#EDF2F4", surfaceColor: "#DDE3E8", primaryColor: "#2B2D42", accentColor: "#D90429",
    fontFamily: "Inter", headlineFont: "Oswald", uppercase: true, layout: "left" },
  { id: "gold-night", name: "Gold Night", bestFor: "Perfume, jewellery",
    backgroundColor: "#000000", surfaceColor: "#14213D", primaryColor: "#FFFFFF", accentColor: "#FCA311",
    fontFamily: "Montserrat", headlineFont: "Montserrat", uppercase: false, layout: "center" },
  { id: "blush", name: "Blush", bestFor: "Lashes, nails, hair",
    backgroundColor: "#F9DBBD", surfaceColor: "#F3CDA9", primaryColor: "#450920", accentColor: "#A53860",
    fontFamily: "Lato", headlineFont: "Playfair Display", uppercase: false, layout: "left" },
  { id: "linen", name: "Linen", bestFor: "Boutique fashion",
    backgroundColor: "#EAE0D5", surfaceColor: "#DED1C2", primaryColor: "#0A0908", accentColor: "#22333B",
    fontFamily: "Inter", headlineFont: "Playfair Display", uppercase: false, layout: "left" },
  { id: "sage", name: "Sage", bestFor: "Skincare, wellness",
    backgroundColor: "#DAD7CD", surfaceColor: "#CBC8BC", primaryColor: "#26392F", accentColor: "#344E41",
    fontFamily: "Lato", headlineFont: "Lato", uppercase: false, layout: "left" },
  { id: "market", name: "Market", bestFor: "Food, groceries",
    backgroundColor: "#FEFAE0", surfaceColor: "#F3EDCB", primaryColor: "#283618", accentColor: "#9A5220",
    fontFamily: "Open Sans", headlineFont: "Montserrat", uppercase: false, layout: "left" },
  { id: "midnight", name: "Midnight", bestFor: "Phones, gadgets",
    backgroundColor: "#0D1321", surfaceColor: "#1D2D44", primaryColor: "#F0EBD8", accentColor: "#F0EBD8",
    fontFamily: "Roboto", headlineFont: "Roboto", uppercase: false, layout: "left" },
  { id: "pop", name: "Pop", bestFor: "Kids, toys, snacks",
    backgroundColor: "#FEE440", surfaceColor: "#F5D820", primaryColor: "#000000", accentColor: "#000000",
    fontFamily: "Roboto", headlineFont: "Oswald", uppercase: true, layout: "center" },
  { id: "cocoa", name: "Cocoa", bestFor: "Bakeries, coffee",
    backgroundColor: "#432818", surfaceColor: "#5A3722", primaryColor: "#FFE6A7", accentColor: "#BB9457",
    fontFamily: "Lato", headlineFont: "Playfair Display", uppercase: false, layout: "left" },
];

const fontsHref = (fonts: (string | undefined)[]) => {
  const unique = Array.from(new Set(fonts.filter((f): f is string => !!f)));
  if (unique.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${unique
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;700;900`)
    .join("&")}&display=swap`;
};

const TEMPLATE_FONTS_HREF = fontsHref(STORE_TEMPLATES.map((t) => t.headlineFont));
const fontStack = (font?: string) => `'${font || "Inter"}', sans-serif`;
const same = (a?: string, b?: string) => (a || "").toLowerCase() === (b || "").toLowerCase();

/** The template whose look the theme still matches, if any (tweaking a colour un-selects it). */
export function activeTemplateId(theme: Theme) {
  return STORE_TEMPLATES.find(
    (t) =>
      same(theme.backgroundColor, t.backgroundColor) &&
      same(theme.surfaceColor, t.surfaceColor) &&
      same(theme.primaryColor, t.primaryColor) &&
      same(theme.accentColor, t.accentColor) &&
      theme.fontFamily === t.fontFamily &&
      theme.hero?.headlineFont === t.headlineFont
  )?.id;
}

export function TemplatePicker({
  theme,
  onPick,
}: {
  theme: Theme;
  onPick: (template: StoreTemplate) => void;
}) {
  const activeId = activeTemplateId(theme);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {TEMPLATE_FONTS_HREF && <link rel="stylesheet" href={TEMPLATE_FONTS_HREF} />}
      {STORE_TEMPLATES.map((t) => {
        const isActive = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onPick(t)}
            className={`text-left rounded-2xl p-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
              isActive ? "bg-black" : "bg-zinc-100 hover:bg-zinc-200"
            }`}
          >
            <div
              className="relative rounded-xl aspect-[4/3] p-3 flex flex-col justify-between overflow-hidden"
              style={{ backgroundColor: t.backgroundColor, color: t.primaryColor }}
            >
              <span
                className={`text-2xl font-black leading-none ${t.uppercase ? "uppercase" : ""}`}
                style={{ fontFamily: fontStack(t.headlineFont) }}
              >
                Aa
              </span>
              <div className="flex items-end gap-1.5">
                <span className="h-6 w-5 rounded-md" style={{ backgroundColor: t.surfaceColor }} />
                <span className="h-6 w-5 rounded-md" style={{ backgroundColor: t.surfaceColor }} />
                <span className="ml-auto h-3 w-8 rounded-full" style={{ backgroundColor: t.accentColor }} />
              </div>
              {isActive && (
                <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-black text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </div>
            <div className="px-1.5 pt-2 pb-1">
              <p className={`text-sm font-bold ${isActive ? "text-white" : "text-zinc-900"}`}>{t.name}</p>
              <p className={`text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>{t.bestFor}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * A small copy of the storefront drawn from the unsaved settings, with the
 * vendor's real products. Card colours come from the same CSS variables
 * product-card.tsx reads, so this matches what customers will see.
 */
export function StorefrontPreview({
  theme,
  storeName,
  storeId,
}: {
  theme: Theme;
  storeName: string;
  storeId: string | null;
}) {
  // Same key and query as the Products page, so this usually comes from cache.
  const { data: products = [] } = useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const snapshot = await getDocs(
        query(collection(db, "stores", storeId, "products"), orderBy("createdAt", "desc"))
      );
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
    },
    enabled: !!storeId,
  });

  const hero = theme.hero || {};
  const heroImage = hero.backgroundImages?.[0];
  const headlineColor = hero.headlineColor || theme.primaryColor || "#000000";
  const align =
    hero.layout === "left" ? "items-start text-left" : hero.layout === "right" ? "items-end text-right" : "items-center text-center";

  const items = products
    .filter((p) => p.images?.[0] || p.imageUrl)
    .slice(0, 4)
    .map((p) => ({ id: p.id, name: p.name, price: p.price, image: p.images?.[0] || p.imageUrl }));
  while (items.length < 4) {
    items.push({ id: `sample-${items.length}`, name: "Your product", price: 120, image: "" });
  }

  const previewFonts = fontsHref([theme.fontFamily, hero.headlineFont, hero.subheadlineFont]);

  return (
    <div
      className="rounded-2xl overflow-hidden border border-zinc-200"
      style={{
        backgroundColor: theme.backgroundColor || "#ffffff",
        color: theme.primaryColor || "#000000",
        fontFamily: fontStack(theme.fontFamily),
        ...storefrontColorVars(theme),
      }}
    >
      {previewFonts && <link rel="stylesheet" href={previewFonts} />}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <span className="font-bold truncate">{storeName || "Your store"}</span>
        <ShoppingBag size={18} className="shrink-0" />
      </div>

      {hero.enabled !== false && (
        <div className="relative px-5 py-10 overflow-hidden">
          {heroImage && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black" style={{ opacity: hero.overlayOpacity ?? 0 }} />
            </>
          )}
          <div className={`relative flex flex-col ${align}`}>
            <p
              className={`text-3xl md:text-4xl font-black tracking-tighter leading-[0.95] max-w-xl ${
                hero.uppercase === false ? "" : "uppercase"
              }`}
              style={{ color: headlineColor, fontFamily: fontStack(hero.headlineFont) }}
            >
              {hero.headline || `Welcome to ${storeName || "your store"}`}
            </p>
            <p
              className="mt-3 text-sm opacity-80 max-w-md"
              style={{ color: headlineColor, fontFamily: fontStack(hero.subheadlineFont) }}
            >
              {hero.subheadline || "Browse our latest collection."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 pb-6">
        {items.map((item) => (
          <div key={item.id} className="min-w-0">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[color:var(--shop-surface,#f4f4f5)]">
              {item.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-x-2 bottom-2 rounded-lg py-2 text-center text-[10px] font-bold uppercase tracking-wide bg-[color:var(--shop-accent,#ffffffe6)] text-[color:var(--shop-accent-ink,#000)]">
                Add to cart
              </div>
            </div>
            <p className="mt-2 text-sm font-bold truncate">{item.name}</p>
            <p className="text-xs truncate text-[color:var(--shop-muted,#71717a)]">{formatCurrency(item.price)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
