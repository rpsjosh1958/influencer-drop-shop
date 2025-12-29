import { useEffect, useState } from "react";
import { Product } from "@/types";
import { Zap } from "lucide-react";

interface PromoCardProps {
  product: Product;
  storeName: string;
  storeLogo?: string;
}

// Helper to bypass CORS by fetching and converting to Base64
const CorsImage = ({
  src,
  alt,
  className,
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [base64, setBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let mounted = true;

    const load = async () => {
      try {
        // Use our own proxy to fetch the image server-side
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Proxy fetch failed");

        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (mounted && reader.result) {
            setBase64(reader.result as string);
          }
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("CorsImage load failed", e);
        // Fallback to original src (will likely fail in canvas if CORS is strict, but better than nothing for viewing)
        if (mounted) setBase64(src);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [src]);

  // If we haven't loaded base64 yet, render a placeholder
  if (!base64)
    return (
      <div
        className={className}
        style={{ ...style, backgroundColor: "#222" }}
      />
    );

  return <img src={base64} alt={alt} className={className} style={style} />;
};

// Fixed dimensions for 9:16 aspect ratio.
// NOTE: We use EXPLICIT HEX COLORS & INLINE STYLES because Tailwind v4 uses OKLCH/LAB which html2canvas crashes on.
export const PromoCard = ({
  product,
  storeName,
  storeLogo,
}: PromoCardProps) => {
  return (
    <div
      id={`promo-card-${product.id}`}
      className="relative overflow-hidden font-sans"
      style={{
        width: "360px",
        height: "640px",
        backgroundColor: "#000000",
        color: "#ffffff",
        background: "linear-gradient(to bottom right, #000000, #111111)",
      }}
    >
      {/* Background Noise/Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />

      {/* Header - Absolute Top */}
      <div
        className="absolute z-20 flex items-center gap-3"
        style={{
          top: "32px",
          left: "32px",
          right: "32px",
          height: "40px",
        }}
      >
        {storeLogo ? (
          <CorsImage
            src={storeLogo}
            alt={storeName}
            className="w-10 h-10 rounded-full object-cover"
            style={{ border: "1px solid rgba(255,255,255,0.2)" }}
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex-shrink-0"
            style={{
              background: "linear-gradient(to top right, #a855f7, #f97316)",
            }}
          />
        )}
        <span
          className="font-black tracking-tighter text-xl uppercase truncate flex-1"
          style={{ fontSize: "1.25rem", lineHeight: "1.2", marginTop: "2px" }}
        >
          {storeName}
        </span>
      </div>

      {/* Main Image Area - Absolute Middle */}
      <div
        className="absolute z-10 rounded-3xl overflow-hidden group"
        style={{
          top: "88px",
          left: "32px",
          right: "32px",
          bottom: "260px", // Leaves space for footer
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          backgroundColor: "#202020",
        }}
      >
        <CorsImage
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {/* Live Badge */}
        <div
          className="absolute bottom-4 left-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
          style={{
            backgroundColor: "#dc2626",
            color: "#ffffff",
            lineHeight: "1",
          }}
        >
          Live Now
        </div>
      </div>

      {/* Footer Info - Absolute Bottom */}
      <div
        className="absolute z-10 rounded-3xl p-6 text-center"
        style={{
          bottom: "32px",
          left: "24px",
          right: "24px",
          height: "210px", // Fixed height container
          backgroundColor: "rgba(30,30,30,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Title Container */}
        <div
          style={{
            height: "64px",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            className="text-2xl font-black leading-tight line-clamp-2"
            style={{ color: "#ffffff", lineHeight: "1.2", margin: 0 }}
          >
            {product.name}
          </h1>
        </div>

        <div className="space-y-4">
          <div>
            <p
              className="text-[10px] font-bold uppercase mb-1 tracking-widest"
              style={{ color: "#a1a1aa", lineHeight: "1" }}
            >
              Price
            </p>
            <p
              className="text-3xl font-mono font-black"
              style={{ lineHeight: "1" }}
            >
              GHS {product.price.toFixed(2)}
            </p>
          </div>

          {/* Fake Button Visual */}
          <div
            className="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest"
            style={{
              backgroundColor: "#ffffff",
              color: "#000000",
              boxShadow: "0 10px 15px -3px rgba(255, 255, 255, 0.1)",
              lineHeight: "1.5",
            }}
          >
            Shop Now
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-2 left-0 w-full text-center text-[10px] font-mono uppercase tracking-widest"
        style={{ color: "#52525b", lineHeight: "1" }}
      >
        Powered by CopDrop.io
      </div>
    </div>
  );
};
