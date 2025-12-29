"use client";

import { useState, useRef } from "react";
import { Product } from "@/types";
import { X, Download, Copy, ExternalLink, Loader2, Check } from "lucide-react";
import { toPng } from "html-to-image";
import { PromoCard } from "./promo-card";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  storeSlug: string;
  storeName: string;
  storeLogo?: string;
}

export const ShareModal = ({
  isOpen,
  onClose,
  product,
  storeSlug,
  storeName,
  storeLogo,
}: ShareModalProps) => {
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `https://copdrop.io/shop/${storeSlug}`; // Ideally deep link to product if supported: ?product=${product.id}

  const handleDownloadImage = async () => {
    // We target the HIDDEN unscaled version, not the preview one
    // content of PromoCard is inside the target div
    const element = document.querySelector(
      "#hidden-promo-target > div"
    ) as HTMLElement;

    if (!element) {
      console.error("Could not find hidden generation target");
      return;
    }

    setGenerating(true);
    try {
      const dataUrl = await toPng(element, {
        quality: 1.0,
        pixelRatio: 2, // 2x resolution
        backgroundColor: "#000000",
      });

      const link = document.createElement("a");
      link.download = `drop-alert-${product.name
        .toLowerCase()
        .replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
      alert("Could not generate image. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${product.name} - GHS ${product.price} \n${shareUrl}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Check this out! ${product.name} just dropped on ${storeName}.\n\n${shareUrl}`
  )}`;

  const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `🚨 NEW DROP ALERT 🚨\n\n${product.name} is now live!\n\nCop it here: ${shareUrl}`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* HIDDEN GENERATION TARGET - Unscaled, Offscreen */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0">
        <div id="hidden-promo-target">
          <PromoCard
            product={product}
            storeName={storeName}
            storeLogo={storeLogo}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row gap-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors z-50"
        >
          <X size={20} />
        </button>

        {/* LEFT: PREVIEW AREA */}
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-2xl p-4 md:p-8 min-h-[400px]">
          <div
            ref={cardRef}
            className="shadow-2xl shadow-black/50 transform scale-[0.6] md:scale-[0.7] origin-center -my-24 md:-my-20"
          >
            <PromoCard
              product={product}
              storeName={storeName}
              storeLogo={storeLogo}
            />
          </div>

          <div className="mt-8 flex gap-3 z-10">
            <button
              onClick={handleDownloadImage}
              disabled={generating}
              className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
              {generating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              Download for Stories
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-4 text-center max-w-xs">
            Download this image to post on Instagram Stories, TikTok, or
            WhatsApp Status. Add the link sticker separately!
          </p>
        </div>

        {/* RIGHT: ACTIONS */}
        <div className="w-full md:w-80 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-2xl font-black mb-2">Share the Hype</h2>
            <p className="text-zinc-500 text-sm">
              Get the word out to your community.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-500 uppercase">
              Direct Link
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg px-3 text-sm font-medium"
              />
              <button
                onClick={copyLink}
                className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 transition-colors"
              >
                {copied ? (
                  <Check size={18} className="text-green-500" />
                ) : (
                  <Copy size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-zinc-500 uppercase">
              Social Quick Actions
            </label>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-4 bg-[#25D366]/10 text-[#25D366] rounded-xl font-bold hover:bg-[#25D366]/20 transition-colors group"
            >
              <span className="flex items-center gap-2">WhatsApp Status</span>
              <ExternalLink size={16} />
            </a>
            <a
              href={twitterLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full p-4 bg-[#1DA1F2]/10 text-[#1DA1F2] rounded-xl font-bold hover:bg-[#1DA1F2]/20 transition-colors group"
            >
              <span className="flex items-center gap-2">
                Post to X (Twitter)
              </span>
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
