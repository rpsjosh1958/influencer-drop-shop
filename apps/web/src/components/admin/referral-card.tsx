"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { httpsCallable } from "firebase/functions";
import { Check, Gift, Share2 } from "lucide-react";
import { auth, functions } from "@/lib/firebase";

// The vendor's own referral code, minted server-side the first time it's
// asked for (functions/src/referrals.ts). A new vendor who signs up with it
// gets an extra month of Growth once their store is approved, and so does
// this vendor.
export function ReferralCard() {
  const [copied, setCopied] = useState(false);
  const { data } = useQuery({
    queryKey: ["referralCode", auth.currentUser?.uid],
    queryFn: async () =>
      (
        await httpsCallable<void, { code: string; rewardedCount: number }>(
          functions,
          "getReferralCode"
        )()
      ).data,
    staleTime: Infinity,
  });

  if (!data) return null;

  const link = `${window.location.origin}/create-store?ref=${data.code}`;
  const share = async () => {
    const text = `Open your store on The Drop with my code ${data.code} and we both get a free month of Growth: ${link}`;
    if (navigator.share) {
      // Rejects when the share sheet is dismissed — nothing to do.
      await navigator.share({ text }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-zinc-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gift size={18} className="text-purple-600" />
          <h2 className="text-lg font-bold text-zinc-900">Refer a Vendor</h2>
        </div>
        <p className="text-zinc-500 text-sm max-w-md">
          When a new vendor signs up with your code and their store is
          approved, you both get an extra month of Growth.
        </p>
        {data.rewardedCount > 0 && (
          <p className="text-[11px] font-bold text-purple-600 mt-2">
            {data.rewardedCount} vendor{data.rewardedCount === 1 ? "" : "s"}{" "}
            joined with your code
          </p>
        )}
      </div>
      <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
        <span className="text-2xl font-black tracking-[0.3em] text-zinc-900 text-center">
          {data.code}
        </span>
        <button
          onClick={share}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-zinc-800 transition-colors"
        >
          {copied ? <Check size={14} /> : <Share2 size={14} />}
          {copied ? "Copied" : "Share Invite"}
        </button>
      </div>
    </div>
  );
}
