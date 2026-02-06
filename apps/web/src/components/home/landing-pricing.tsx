"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";

const PLANS = [
  {
    name: "Starter",
    description:
      "Zero risk, zero catch. Start selling today, pay nothing upfront.",
    features: [
      "Web Store Only",
      "Unlimited Products",
      "Basic Customization",
      "8% Transaction Fee",
      "Payouts in 48 Hours",
    ],
    cta: "Run It Free",
    popular: false,
  },
  {
    name: "Growth",
    description:
      "Maximum scale. Get your own mobile app presence and full branding control.",
    features: [
      "Everything in Starter",
      "30-Day Free Trial",
      "Featured on Mobile App",
      "Full Brand Customization",
      "AI Store Assistant (Beta)",
      "Verified Store Badge",
      "2% Transaction Fee",
      "Instant Withdrawals",
    ],
    cta: "Start 30-Day Free Trial",
    popular: true,
  },
];

type BillingCycle = "monthly" | "quarterly" | "yearly";

export function LandingPricing() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  const getPrice = (planName: string) => {
    if (planName === "Starter") return "Free";
    if (cycle === "monthly") return "GH₵ 250";
    if (cycle === "quarterly") return "GH₵ 700"; // 10% Discount (750 -> 675)
    if (cycle === "yearly") return "GH₵ 2,500"; // 2 Months Free (3000 -> 2500)
    return "0";
  };

  const getPeriod = () => {
    if (cycle === "monthly") return "/mo";
    if (cycle === "quarterly") return "/qtr";
    if (cycle === "yearly") return "/yr";
    return "";
  };

  return (
    <section id="pricing" className="py-32 bg-black relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Simple, Transparent <br />{" "}
            <span className="text-zinc-600">Pricing</span>
          </h2>
          <p className="text-zinc-400 mb-2">
            We eat when you eat. No upfront costs. No surprises.
          </p>
          <p className="text-sm text-zinc-500 mb-8">
            Scale your revenue without breaking the bank.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex bg-zinc-900 rounded-full p-1 border border-zinc-800 relative z-20">
            {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  cycle === c
                    ? "bg-white text-black shadow-lg"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          {cycle !== "monthly" && (
            <p className="text-xs text-purple-400 mt-4 font-medium animate-pulse">
              {cycle === "quarterly" ? "" : "Get 2 Months Free"}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`relative p-12 rounded-3xl border ${
                plan.popular
                  ? "bg-zinc-900/80 border-purple-500/50 shadow-2xl shadow-purple-900/20"
                  : "bg-black/50 border-white/10 hover:border-white/20"
              } backdrop-blur-xl transition-all duration-300 hover:-translate-y-2`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <motion.span
                    key={cycle} // Animate on change
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-black"
                  >
                    {getPrice(plan.name)}
                  </motion.span>
                  {getPrice(plan.name) !== "Free" && (
                    <span className="text-zinc-500">{getPeriod()}</span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm mt-4">{plan.description}</p>
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feat, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div
                      className={`p-1 rounded-full ${
                        plan.popular
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <Check size={12} />
                    </div>
                    <span className="text-sm font-medium text-zinc-300">
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/create-store" className="block w-full">
                <button
                  className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-lg shadow-purple-900/30"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
