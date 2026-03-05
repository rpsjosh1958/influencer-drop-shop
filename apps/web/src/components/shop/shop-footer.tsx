"use client";

import Link from "next/link";
import { Star } from "lucide-react";

interface ShopFooterProps {
  theme: any;
  store: any;
  onOpenReviews: () => void;
  onOpenComplaint: () => void;
}

export function ShopFooter({
  theme,
  store,
  onOpenReviews,
  onOpenComplaint,
}: ShopFooterProps) {
  if (!theme?.footer?.enabled) return null;

  const footer = theme.footer || {};
  const { text, socials = {}, contact = {} } = footer;
  const primaryColor = theme.primaryColor || "#000000";

  return (
    <footer
      className="mt-32 border-t border-black/5 py-16 px-6"
      style={{ borderColor: `${primaryColor}20` }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-sm">
        {/* Brand / Copyright */}
        <div className="space-y-4 text-center md:text-left">
          <div>
            <h3
              className="font-black text-xl tracking-tighter uppercase"
              style={{ color: primaryColor }}
            >
              {store?.name || "DROP."}
            </h3>

            {(store?.rating || 0) > 0 && (
              <button
                onClick={onOpenReviews}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold bg-black/5 px-2.5 py-1.5 rounded-lg hover:bg-black/10 transition-colors"
                style={{ color: primaryColor }}
              >
                <Star size={12} className="fill-current" />
                <span>{Number(store.rating).toFixed(1)}</span>
                <span className="opacity-50">
                  ({store.reviewCount} reviews)
                </span>
              </button>
            )}
          </div>

          <p className="opacity-60">{text || "© 2025 All rights reserved."}</p>
          <div className="pt-4 space-y-2">
            <div>
              <Link
                href="/?stay=true"
                className="text-xs font-bold opacity-30 hover:opacity-100 transition-opacity uppercase tracking-widest border-b border-transparent hover:border-current pb-0.5"
              >
                Powered by The Drop
              </Link>
            </div>
            <div>
              <button
                onClick={onOpenComplaint}
                className="text-xs font-bold opacity-30 hover:text-red-500 hover:opacity-100 transition-all uppercase tracking-widest"
              >
                File a Complaint
              </button>
            </div>
          </div>
        </div>

        {/* Socials */}
        <div className="space-y-4 text-center">
          <h4 className="font-bold opacity-40 uppercase tracking-widest text-xs">
            Follow Us
          </h4>
          <div className="flex flex-col gap-2 opacity-80 box-decoration-slice">
            {socials.instagram && <span>IG: {socials.instagram}</span>}
            {socials.twitter && <span>TW: {socials.twitter}</span>}
            {socials.tiktok && <span>TT: {socials.tiktok}</span>}
            {!socials.instagram && !socials.twitter && !socials.tiktok && (
              <span className="opacity-50 italic">No socials linked</span>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4 text-center md:text-right">
          <h4 className="font-bold opacity-40 uppercase tracking-widest text-xs">
            Contact & Location
          </h4>
          <div className="flex flex-col gap-2 opacity-80">
            {contact.email && (
              <span className="underline decoration-1">{contact.email}</span>
            )}
            {contact.address && <span>{contact.address}</span>}
            {!contact.email && !contact.address && (
              <span className="opacity-50 italic">No contact info</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
