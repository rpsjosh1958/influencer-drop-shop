
"use client";

import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    price: "Free",
    description:
      "Launch your brand with zero upfront risk. We only make money when you do.",
    features: [
      "Unlimited Products",
      "8% Transaction Fee",
      "Standard Payouts (T+2)",
      "Mobile App Listing",
      "Basic Analytics",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Growth",
    price: "GH₵ 250",
    description:
      "Maximum profit for high-volume sellers. Pay a flat rate and keep your margins.",
    features: [
      "Everything in Starter",
      "2% Transaction Fee",
      "Instant Withdrawals",
      "Verified Store Badge",
      "Priority 24/7 Support",
    ],
    cta: "Go Pro",
    popular: true,
  },
];

export function LandingPricing() {
  return (
    <section id="pricing" className="py-32 bg-black relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-24">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            Simple, Transparent <br />{" "}
            <span className="text-zinc-600">Pricing</span>
          </h2>
          <p className="text-zinc-400">
            Scale your revenue without breaking the bank.
          </p>
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
                  <span className="text-4xl font-black">{plan.price}</span>
                  {plan.price !== "Free" && (
                    <span className="text-zinc-500">/mo</span>
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

              <button
                className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                  plan.popular
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-lg shadow-purple-900/30"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
