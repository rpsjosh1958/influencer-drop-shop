import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Product } from "@/types";
import { CorsImage } from "./cors-image";

export type StorePromoTemplate = "signal" | "rack";
export type StorePromoFormat = "story" | "post";

const FLYER_FONT_FAMILY = "'Helvetica Neue', Arial, sans-serif";

// The fallback for a store with no logo uploaded yet — The Drop's own mark,
// not generated initials.
const FALLBACK_LOGO_SRC = "/assets/landing/drop_logo.svg";

// A long store name shouldn't be able to blow out the flyer's padding.
// Reverted from a canvas measureText() approach — canvas's font parser
// only reliably recognizes the keyword "bold", not a numeric weight like
// "900" (silently left the context at its 10px default in practice, so
// the shrink logic never actually engaged). A plain character-count
// heuristic can't fail that way: no browser API involved, so there's
// nothing to silently no-op. Less precise than real measurement, but
// deterministic and paired with generous padding (below) so it only
// needs to be approximately right.
//
// One word: shrink by character count, keep it on one line, never break
// the word itself. Multiple words: only shrink if the single longest
// word is itself long enough to need it — otherwise leave sizing alone
// and let the caller's 2-line clamp wrap it naturally.
const COMFORTABLE_NAME_CHARS = 8;

function fitStoreName(
  name: string,
  baseSize: number,
  minSize: number
): { fontSize: number; whiteSpace: "nowrap" | "normal"; wordBreak: "normal" | "break-word" } {
  const hasSpace = /\s/.test(name.trim());
  const words = hasSpace ? name.split(/\s+/) : [name];
  const longest = Math.max(...words.map((w) => w.length));

  const fontSize =
    longest > COMFORTABLE_NAME_CHARS
      ? Math.max(
          minSize,
          Math.round((baseSize * COMFORTABLE_NAME_CHARS) / longest)
        )
      : baseSize;

  return {
    fontSize,
    whiteSpace: hasSpace ? "normal" : "nowrap",
    wordBreak: hasSpace ? "break-word" : "normal",
  };
}

// Rack's header name is a single-line label next to the logo — measures
// the whole string (not just the longest word), since it never wraps.
function fitSingleLine(
  name: string,
  baseSize: number,
  minSize: number,
  comfortableChars = 10
): number {
  if (name.length <= comfortableChars) return baseSize;
  return Math.max(
    minSize,
    Math.round((baseSize * comfortableChars) / name.length)
  );
}

interface StorePromoCardProps {
  template: StorePromoTemplate;
  format: StorePromoFormat;
  storeName: string;
  storeLogo?: string;
  storeSlug: string;
  products: Product[]; // up to 3, used by "rack" only
  onImageLoad?: () => void;
}

const DIMENSIONS: Record<StorePromoFormat, { width: number; height: number }> = {
  story: { width: 360, height: 640 },
  post: { width: 360, height: 450 },
};

// NOTE: explicit hex colors + inline styles throughout (matches
// PromoCard's established approach) — Tailwind v4's oklch() color
// functions crash html-to-image's rasterizer.
export const StorePromoCard = ({
  template,
  format,
  storeName,
  storeLogo,
  storeSlug,
  products,
  onImageLoad,
}: StorePromoCardProps) => {
  const { width, height } = DIMENSIONS[format];
  const shopUrl = `https://copdrop.io/shop/${storeSlug}`;
  const rackProducts = products.slice(0, 3);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(shopUrl, {
      margin: 1,
      width: 200,
      color: { dark: "#0A0A0C", light: "#FFFFFF" },
    })
      .then((url) => mounted && setQrDataUrl(url))
      .catch((err) => console.error("QR generation failed", err));
    return () => {
      mounted = false;
    };
  }, [shopUrl]);

  // Tracks images this template actually needs, so onImageLoad only fires
  // once everything is really ready to rasterize (same gating pattern as
  // PromoCard). The header logo always counts now — real logo or the
  // Drop-mark fallback, both are real <img> loads.
  const [loadedCount, setLoadedCount] = useState(0);
  const requiredImages = 1 + (template === "rack" ? rackProducts.length : 0);

  const signalNameStyle = useMemo(
    () =>
      fitStoreName(
        storeName,
        format === "story" ? 44 : 34,
        format === "story" ? 20 : 16
      ),
    [storeName, format]
  );
  const rackNameSize = useMemo(
    () => fitSingleLine(storeName, 18, 12),
    [storeName]
  );

  useEffect(() => {
    if (qrDataUrl && loadedCount >= requiredImages) {
      const t = setTimeout(() => onImageLoad?.(), 100);
      return () => clearTimeout(t);
    }
  }, [qrDataUrl, loadedCount, requiredImages, onImageLoad]);

  const handleImgLoad = () => setLoadedCount((c) => c + 1);

  const QRChip = ({ size = 110 }: { size?: number }) => (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        boxShadow: "0 12px 24px -10px rgba(0,0,0,0.45)",
      }}
    >
      <div style={{ width: size, height: size, background: "#fff" }}>
        {qrDataUrl && (
          <img
            src={qrDataUrl}
            alt="QR code"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontWeight: 800,
          fontSize: "10px",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#111",
        }}
      >
        Scan to Shop
      </p>
    </div>
  );

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        fontFamily: FLYER_FONT_FAMILY,
        backgroundColor: "#0A0A0C",
        color: "#ffffff",
      }}
    >
      {template === "signal" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 28%, rgba(168,85,247,0.55), rgba(236,72,153,0.32) 42%, rgba(249,115,22,0) 72%), linear-gradient(to bottom right, #000000, #111111)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding:
              format === "story" ? "56px 40px 40px" : "36px 40px 30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "20px",
            }}
          >
            <span
              style={{
                background: "#ffffff",
                color: "#0A0A0C",
                fontWeight: 900,
                fontSize: "10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                padding: "6px 14px",
                borderRadius: "999px",
              }}
            >
              Now on The Drop.
            </span>
            {storeLogo ? (
              <CorsImage
                src={storeLogo}
                alt={storeName}
                onLoad={handleImgLoad}
                style={{
                  height: format === "story" ? 84 : 64,
                  maxWidth: format === "story" ? 220 : 170,
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.5))",
                }}
              />
            ) : (
              <img
                src={FALLBACK_LOGO_SRC}
                alt={storeName}
                onLoad={handleImgLoad}
                style={{
                  height: format === "story" ? 84 : 64,
                  width: "auto",
                  objectFit: "contain",
                  filter: "drop-shadow(0 12px 20px rgba(0,0,0,0.5))",
                }}
              />
            )}
            <h1
              style={{
                fontSize: signalNameStyle.fontSize,
                lineHeight: 0.95,
                fontWeight: 900,
                letterSpacing: "0.01em",
                textTransform: "uppercase",
                margin: 0,
                maxWidth: 280, // 360 card width minus 40px padding each side
                whiteSpace: signalNameStyle.whiteSpace,
                wordBreak: signalNameStyle.wordBreak,
                overflowWrap: "break-word",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {storeName}
            </h1>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
                marginTop: format === "story" ? "28px" : "16px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                Visit the Store
              </p>
              <span
                style={{
                  background: "#ffffff",
                  color: "#0A0A0C",
                  fontWeight: 800,
                  fontSize: "11px",
                  fontFamily:
                    "'JetBrains Mono','SF Mono',Consolas,monospace",
                  padding: "8px 16px",
                  borderRadius: "999px",
                }}
              >
                {shopUrl.replace(/^https?:\/\//, "")}
              </span>
            </div>
          </div>
           <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                OR
              </p>
          <QRChip />
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            padding:
              format === "story" ? "26px 30px 40px" : "22px 28px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            {storeLogo ? (
              <CorsImage
                src={storeLogo}
                alt={storeName}
                onLoad={handleImgLoad}
                style={{
                  height: 32,
                  maxWidth: 90,
                  width: "auto",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
              />
            ) : (
              <img
                src={FALLBACK_LOGO_SRC}
                alt={storeName}
                onLoad={handleImgLoad}
                style={{ height: 32, width: "auto", flexShrink: 0 }}
              />
            )}
            <span
              style={{
                fontWeight: 900,
                fontSize: rackNameSize,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 170,
                display: "inline-block",
              }}
            >
              {storeName}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: rackProducts.length > 1 ? "1fr 1fr" : "1fr",
              gridTemplateRows:
                rackProducts.length > 2
                  ? format === "story"
                    ? "1.55fr 1fr"
                    : "1.15fr 1fr"
                  : "1fr",
              gap: "10px",
              minHeight: 0,
            }}
          >
            {rackProducts.map((p, i) => (
              <div
                key={p.id}
                style={{
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)",
                  backgroundColor: "#202020",
                  gridColumn: i === 0 && rackProducts.length > 2 ? "1 / 3" : undefined,
                }}
              >
                <CorsImage
                  src={p.imageUrl}
                  alt={p.name}
                  onLoad={handleImgLoad}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    inset: 0,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0) 55%)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 10,
                    fontSize: 11,
                    lineHeight: 1.35,
                    color: "#fff",
                  }}
                >
                  {p.name}
                  <br />
                  <span style={{ fontWeight: 700, fontSize: 11.5 }}>
                    GHS {p.price.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                flex: 1,
                background: "#ffffff",
                color: "#0A0A0C",
                textAlign: "center",
                fontWeight: 900,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "13px 0",
                borderRadius: "12px",
              }}
            >
              Shop Now
            </div>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "8px",
              }}
            >
              <div style={{ width: 46, height: 46 }}>
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR code"
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
};
