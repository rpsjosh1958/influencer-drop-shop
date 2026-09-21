"use client";

import { useState } from "react";
import Link from "next/link";

type BillingCycle = "monthly" | "quarterly" | "yearly";

// Matches functions/src/billing.ts BILLING_PLANS exactly.
const GROWTH_PRICE: Record<BillingCycle, string> = {
  monthly: "GH₵250",
  quarterly: "GH₵700",
  yearly: "GH₵2,500",
};
const GROWTH_PERIOD: Record<BillingCycle, string> = {
  monthly: "/month",
  quarterly: "/quarter",
  yearly: "/year",
};
const GROWTH_NOTE: Record<BillingCycle, string> = {
  monthly:
    "Everything in Starter plus:",
  quarterly: "Billed every three months — about 10% less than paying monthly.",
  yearly: "Two months free versus monthly billing. Best if you sell year-round.",
};

const STARTER_FEATURES = [
  "Web storefront",
  "Unlimited products and services",
  "Basic customisation",
  "Automatic Paystack payouts",
  "8% transaction fee",
];

const GROWTH_FEATURES = [
  "Everything in Starter",
  "30-day free trial",
  "Featured in the mobile app",
  "Full brand customisation",
  "Store assistant (beta)",
  "Broadcast messages to your customers",
  "Verified badge",
  "2% transaction fee",
];

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

export function LandingPricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section id="pricing" className="scroll-mt-20 max-w-[1240px] mx-auto px-6 md:px-7 pt-[120px]">
      <div className="max-w-[38em] mb-10">
        <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(34px,4.4vw,54px)] tracking-[-0.012em] leading-[1.04] mb-4">
          We only earn when you do.
        </h2>
        <p className="text-lg leading-relaxed text-[#14130F]/64">
          Start free and stay free until selling is worth paying for. Upgrade
          when the volume justifies the lower fee.
        </p>
      </div>

      <div className="inline-flex p-1 border border-[#14130F]/18 rounded-full mb-[34px] gap-0.5">
        {CYCLES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setCycle(c.key)}
            className="border-0 cursor-pointer text-[13px] font-semibold px-5 py-2.5 rounded-full transition-colors"
            style={{
              background: cycle === c.key ? "#14130F" : "transparent",
              color: cycle === c.key ? "#EFEBE3" : "rgba(20,19,15,0.6)",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5">
        {/* Starter */}
        <div className="border border-[#14130F]/16 rounded-2xl px-[34px] py-[38px] flex flex-col">
          <h3 className="font-[family-name:var(--font-spline-mono)] text-[15px] font-semibold tracking-[0.1em] uppercase mb-5 text-[#14130F]/72">
            Starter
          </h3>
          <div className="font-[family-name:var(--font-gloock)] text-[52px] leading-none mb-2.5">
            Free
          </div>
          <p className="text-[15.5px] leading-relaxed text-[#14130F]/64 mb-7">
            Zero upfront, zero commitment. An 8% fee applies only on what you
            actually sell.
          </p>
          <ul className="grid gap-3 mb-8">
            {STARTER_FEATURES.map((feat) => (
              <li key={feat} className="flex gap-2.5 text-[15px] text-[#14130F]/82">
                <span className="text-[#B4472B]">✓</span>
                {feat}
              </li>
            ))}
          </ul>
          <Link
            href="/create-store"
            className="mt-auto text-center border border-[#14130F]/24 rounded-full py-3.5 text-[15px] font-semibold hover:border-[#14130F] hover:bg-[#14130F]/4 transition-colors"
          >
            Open a free store
          </Link>
        </div>

        {/* Growth */}
        <div className="relative border border-[#14130F] rounded-2xl px-[34px] py-[38px] flex flex-col bg-[#14130F] text-[#EFEBE3]">
          <span className="absolute -top-[11px] left-[34px] bg-[#B4472B] text-white font-[family-name:var(--font-spline-mono)] text-[10px] tracking-[0.12em] uppercase px-3 py-[5px] rounded-full">
            Most creators
          </span>
          <h3 className="font-[family-name:var(--font-spline-mono)] text-[15px] font-semibold tracking-[0.1em] uppercase mb-5 text-[#EFEBE3]/60">
            Growth
          </h3>
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className="font-[family-name:var(--font-gloock)] text-[52px] leading-none">
              {GROWTH_PRICE[cycle]}
            </span>
            <span className="font-[family-name:var(--font-spline-mono)] text-[13px] text-[#EFEBE3]/72">
              {GROWTH_PERIOD[cycle]}
            </span>
          </div>
          <p className="text-[15.5px] leading-relaxed text-[#EFEBE3]/66 mb-7">
            {GROWTH_NOTE[cycle]}
          </p>
          <ul className="grid gap-3 mb-8">
            {GROWTH_FEATURES.map((feat) => (
              <li key={feat} className="flex gap-2.5 text-[15px] text-[#EFEBE3]/88">
                <span className="text-[#E08A6B]">✓</span>
                {feat}
              </li>
            ))}
          </ul>
          <Link
            href="/create-store"
            className="mt-auto text-center bg-[#EFEBE3] text-[#14130F] rounded-full py-3.5 text-[15px] font-semibold hover:bg-[#B4472B] hover:text-white transition-colors"
          >
            Start the 30-day trial
          </Link>
        </div>
      </div>
    </section>
  );
}
