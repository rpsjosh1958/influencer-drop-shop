"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { toPng } from "html-to-image";
import { X, Download, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { CorsImage } from "./cors-image";
import type { DiscountCode } from "@/types";
import { toJsDate } from "@/lib/utils";

// 9:16 — made for WhatsApp status / Instagram stories.
const WIDTH = 360;
const HEIGHT = 640;
const FONT = "'Helvetica Neue', Arial, sans-serif";
const MONO = "'JetBrains Mono','SF Mono',Consolas,monospace";
const FALLBACK_LOGO_SRC = "/assets/landing/drop_logo.svg";

// Character-count sizing (same reasoning as store-promo-card.tsx's
// fitStoreName: no canvas measuring, nothing to silently no-op). `perChar`
// is roughly one glyph's width in em.
const fit = (text: string, base: number, room: number, perChar: number) =>
  Math.min(base, Math.floor(room / (text.length * perChar)));

const describe = (code: DiscountCode) => {
  const headline = code.type === "percent" ? `${code.value}%` : `GHS ${code.value}`;
  const expires = toJsDate(code.expiresAt);
  const terms = [
    code.minOrder ? `On orders over GHS ${code.minOrder}` : null,
    expires
      ? `Valid until ${expires.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : null,
  ].filter((t): t is string => !!t);
  return { headline, terms };
};

interface CardProps {
  code: DiscountCode;
  storeName: string;
  storeLogo?: string;
  storeSlug: string;
  onReady?: () => void;
}

// Explicit hex + inline styles only: Tailwind v4's oklch() colors crash
// html-to-image's rasterizer (see store-promo-card.tsx).
function DiscountPromoCard({ code, storeName, storeLogo, storeSlug, onReady }: CardProps) {
  const shopUrl = `https://copdrop.io/shop/${storeSlug}`;
  const { headline, terms } = describe(code);

  const [qr, setQr] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(shopUrl, { margin: 1, width: 200, color: { dark: "#0A0A0C", light: "#FFFFFF" } })
      .then((url) => mounted && setQr(url))
      .catch((err) => console.error("QR generation failed", err));
    return () => {
      mounted = false;
    };
  }, [shopUrl]);

  useEffect(() => {
    if (qr && logoLoaded) {
      const t = setTimeout(() => onReady?.(), 100);
      return () => clearTimeout(t);
    }
  }, [qr, logoLoaded, onReady]);

  const logoStyle: React.CSSProperties = { height: 34, maxWidth: 90, width: "auto", objectFit: "contain", flexShrink: 0 };

  return (
    <div
      style={{
        position: "relative",
        width: WIDTH,
        height: HEIGHT,
        overflow: "hidden",
        fontFamily: FONT,
        color: "#ffffff",
        background:
          "radial-gradient(circle at 50% 38%, rgba(168,85,247,0.55), rgba(236,72,153,0.3) 45%, rgba(0,0,0,0) 75%), linear-gradient(to bottom right, #000000, #111111)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "32px 32px 34px",
        boxSizing: "border-box",
      }}
    >
      {/* Store */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {storeLogo ? (
          <CorsImage src={storeLogo} alt={storeName} onLoad={() => setLogoLoaded(true)} style={logoStyle} />
        ) : (
          <img src={FALLBACK_LOGO_SRC} alt={storeName} onLoad={() => setLogoLoaded(true)} style={logoStyle} />
        )}
        <span
          style={{
            fontWeight: 900,
            fontSize: fit(storeName, 18, 210, 0.65),
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {storeName}
        </span>
      </div>

      {/* Offer */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18 }}>
        <span
          style={{
            background: "#ffffff",
            color: "#0A0A0C",
            fontWeight: 900,
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "6px 14px",
            borderRadius: 999,
          }}
        >
          Exclusive Offer
        </span>
        <div style={{ lineHeight: 0.9 }}>
          <div style={{ fontWeight: 900, fontSize: fit(headline, 104, 290, 0.62) }}>{headline}</div>
          <div style={{ fontWeight: 900, fontSize: 40, letterSpacing: "0.12em" }}>OFF</div>
        </div>
        <div
          style={{
            border: "2px dashed rgba(255,255,255,0.7)",
            borderRadius: 16,
            padding: "14px 22px",
            background: "rgba(0,0,0,0.35)",
            maxWidth: 290,
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>
            Use code
          </div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: fit(code.id, 34, 250, 0.75), letterSpacing: "0.15em" }}>
            {code.id}
          </div>
        </div>
        {terms.length > 0 && (
          <div style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(255,255,255,0.7)" }}>
            {terms.map((t) => (
              <div key={t}>{t}</div>
            ))}
          </div>
        )}
      </div>

      {/* Where to use it */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ background: "#ffffff", borderRadius: 12, padding: 7, flexShrink: 0 }}>
          <div style={{ width: 64, height: 64 }}>
            {qr && <img src={qr} alt="QR code" style={{ width: "100%", height: "100%", display: "block" }} />}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Scan to shop
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", margin: "2px 0 4px" }}>
            Enter the code at checkout
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {shopUrl.replace(/^https?:\/\//, "")}
          </div>
        </div>
      </div>

      <p
        style={{
          position: "absolute",
          bottom: 9,
          left: 0,
          width: "100%",
          textAlign: "center",
          fontSize: 8.5,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          margin: 0,
        }}
      >
        Powered by CopDrop.io
      </p>
    </div>
  );
}

interface ModalProps {
  code: DiscountCode;
  storeSlug: string;
  storeName: string;
  storeLogo?: string;
  onClose: () => void;
}

// Share image + message for one discount code, opened from /admin/discounts.
export function DiscountShareModal({ code, storeSlug, storeName, storeLogo, onClose }: ModalProps) {
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const shopUrl = `https://copdrop.io/shop/${storeSlug}`;
  const { headline, terms } = describe(code);
  const message = [
    `${headline} off at ${storeName} 🛍️`,
    `Use code ${code.id} at checkout.`,
    ...terms,
    shopUrl,
  ].join("\n");

  const download = async () => {
    const node = captureRef.current?.firstElementChild as HTMLElement | null;
    if (!node) return;
    setGenerating(true);
    try {
      // Re-capture until two results match: works around WebKit's blank-
      // image html-to-image bug (full note in store-share-modal.tsx).
      const opts = { quality: 1.0, pixelRatio: 2, backgroundColor: "#000000" };
      let dataUrl = await toPng(node, opts);
      for (let attempt = 0; attempt < 4; attempt++) {
        const next = await toPng(node, opts);
        if (next === dataUrl) break;
        dataUrl = next;
      }
      const link = document.createElement("a");
      link.download = `${storeSlug}-${code.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate discount share image", err);
      alert("Could not generate image. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyMessage = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardProps = { code, storeName, storeLogo, storeSlug };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Unscaled offscreen copy — this is what gets rasterized. */}
          <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0">
            <div ref={captureRef}>
              <DiscountPromoCard {...cardProps} onReady={() => setReady(true)} />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-3xl w-full p-6 md:p-8 relative flex flex-col md:flex-row gap-8 shadow-2xl my-8">
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors z-10"
            >
              <X size={20} />
            </button>

            <div className="flex-1 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-2xl p-4 min-h-[400px]">
              <div className="shadow-2xl shadow-black/50 scale-[0.6] md:scale-[0.7] origin-center -my-16 md:-my-10">
                <DiscountPromoCard {...cardProps} />
              </div>
            </div>

            <div className="w-full md:w-72 flex flex-col justify-center gap-5">
              <div>
                <h2 className="text-2xl font-black mb-1">Share {code.id}</h2>
                <p className="text-zinc-500 text-sm">
                  Post it on your status or stories so customers use it at checkout.
                </p>
              </div>

              <button
                onClick={download}
                disabled={generating || !ready}
                className="flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {generating || !ready ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {generating || !ready ? "Creating Image..." : "Download Image"}
              </button>

              <button
                onClick={copyMessage}
                className="flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-6 py-3 rounded-xl font-bold text-sm"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                {copied ? "Copied" : "Copy Message"}
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold hover:bg-[#25D366]/20 transition-colors"
              >
                Send on WhatsApp
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
