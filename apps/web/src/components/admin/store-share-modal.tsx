"use client";

import { useState } from "react";
import { Product } from "@/types";
import {
  X,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Check,
  Radio,
  LayoutGrid,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  StorePromoCard,
  StorePromoTemplate,
  StorePromoFormat,
} from "./store-promo-card";
import { Portal } from "@/components/ui/portal";

interface StoreShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSlug: string;
  storeName: string;
  storeLogo?: string;
  products: Product[]; // most-recent active products with real photos
}

export const StoreShareModal = ({
  isOpen,
  onClose,
  storeSlug,
  storeName,
  storeLogo,
  products,
}: StoreShareModalProps) => {
  const rackAvailable = products.length > 0;
  const [template, setTemplate] = useState<StorePromoTemplate>(
    rackAvailable ? "rack" : "signal"
  );
  const [format, setFormat] = useState<StorePromoFormat>("story");
  const [generating, setGenerating] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `https://copdrop.io/shop/${storeSlug}`;

  const handleDownloadImage = async () => {
    const element = document.querySelector(
      "#hidden-store-promo-target > div"
    ) as HTMLElement;
    if (!element) return;

    setGenerating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // WebKit (iOS Safari) has a documented html-to-image bug: capturing
      // a subtree with large images intermittently comes back with just
      // those images blank, even after they've genuinely loaded — a
      // WebKit SVG-image-loader quirk, not a timing issue on our side
      // (confirmed against real device testing in html-to-image's own
      // issue tracker, bubkoo/html-to-image#591). A single retry isn't
      // reliable either — it can come back blank again. The only thing
      // that reliably works is re-capturing until two consecutive
      // results are byte-identical (usually converges by attempt 2-3).
      // Cheap on browsers that don't have the bug — they converge on the
      // first comparison.
      const toPngOptions = { quality: 1.0, pixelRatio: 2, backgroundColor: "#000000" };
      let dataUrl = await toPng(element, toPngOptions);
      for (let attempt = 0; attempt < 4; attempt++) {
        const next = await toPng(element, toPngOptions);
        if (next === dataUrl) break;
        dataUrl = next;
      }

      const link = document.createElement("a");
      link.download = `${storeSlug}-${template}-${format}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate store share image", err);
      alert("Could not generate image. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${storeName} is now on The Drop!\n${shareUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(
    `Check out my store, ${storeName}, on The Drop!\n\n${shareUrl}`
  )}`;
  const twitterLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `🛍️ ${storeName} is now live on The Drop!\n\nShop here: ${shareUrl}`
  )}`;

  const selectTemplate = (t: StorePromoTemplate) => {
    if (t === "rack" && !rackAvailable) return;
    setTemplate(t);
    setImagesReady(false);
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 backdrop-blur-sm">
        <div className="flex min-h-full items-center justify-center p-4 text-center">
          {/* HIDDEN GENERATION TARGET - Unscaled, Offscreen */}
          <div className="fixed left-[-9999px] top-0 pointer-events-none opacity-0">
            <div id="hidden-store-promo-target">
              <StorePromoCard
                key={`${template}-${format}`}
                template={template}
                format={format}
                storeName={storeName}
                storeLogo={storeLogo}
                storeSlug={storeSlug}
                products={products}
                onImageLoad={() => setImagesReady(true)}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-4xl w-full p-6 md:p-8 relative flex flex-col md:flex-row gap-8 text-left shadow-2xl my-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 transition-colors z-50"
            >
              <X size={20} />
            </button>

            {/* LEFT: PREVIEW AREA */}
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-950 rounded-2xl p-4 md:p-8 min-h-[400px]">
              <div className="shadow-2xl shadow-black/50 transform scale-[0.6] md:scale-[0.7] origin-center -my-16 md:-my-10">
                <StorePromoCard
                  key={`preview-${template}-${format}`}
                  template={template}
                  format={format}
                  storeName={storeName}
                  storeLogo={storeLogo}
                  storeSlug={storeSlug}
                  products={products}
                />
              </div>

              <div className="mt-6 flex gap-3 z-10 w-full justify-center">
                <button
                  onClick={handleDownloadImage}
                  disabled={generating || !imagesReady}
                  className="flex items-center gap-2 bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform w-full md:w-auto justify-center disabled:opacity-50 disabled:scale-100"
                >
                  {generating || !imagesReady ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Download size={18} />
                  )}
                  {generating || !imagesReady
                    ? "Creating Image..."
                    : "Download for Stories"}
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
                <h2 className="text-2xl font-black mb-2">Share Your Store</h2>
                <p className="text-zinc-500 text-sm">
                  Get the word out to your community.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-zinc-500 uppercase">
                  Design
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => selectTemplate("signal")}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold text-xs transition-colors ${
                      template === "signal"
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
                    }`}
                  >
                    <Radio size={16} />
                    Signal
                  </button>
                  <button
                    onClick={() => selectTemplate("rack")}
                    disabled={!rackAvailable}
                    title={
                      rackAvailable
                        ? undefined
                        : "Add products with photos to unlock this design"
                    }
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      template === "rack"
                        ? "border-black dark:border-white bg-black dark:bg-white text-white dark:text-black"
                        : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
                    }`}
                  >
                    <LayoutGrid size={16} />
                    Rack
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="inline-flex bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 gap-1">
                  {(["story", "post"] as StorePromoFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFormat(f);
                        setImagesReady(false);
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-colors ${
                        format === f
                          ? "bg-white dark:bg-zinc-900 text-black dark:text-white shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      {f === "story" ? "Story · 9:16" : "Post · 4:5"}
                    </button>
                  ))}
                </div>
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
      </div>
    </Portal>
  );
};
