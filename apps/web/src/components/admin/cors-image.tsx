import { useEffect, useState } from "react";

// Shared by PromoCard and StorePromoCard — fetches an image through our own
// proxy and converts it to base64 so html-to-image can rasterize it (a
// plain cross-origin <img> silently taints the canvas otherwise).
export const CorsImage = ({
  src,
  alt,
  className,
  style,
  onLoad,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
}) => {
  const [base64, setBase64] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    let mounted = true;

    const load = async () => {
      try {
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(src)}`;
        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("Proxy fetch failed");

        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (mounted && reader.result) {
            setBase64(reader.result as string);
            onLoad?.();
          }
        };
        reader.readAsDataURL(blob);
      } catch (e) {
        console.error("CorsImage load failed", e);
        if (mounted) {
          setBase64(src);
          onLoad?.();
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [src]);

  if (!base64)
    return (
      <div
        className={className}
        style={{ ...style, backgroundColor: "#222" }}
      />
    );

  return <img src={base64} alt={alt} className={className} style={style} />;
};
