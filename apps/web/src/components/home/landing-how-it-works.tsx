"use client";

import { motion } from "framer-motion";
import { Zap, Box, DollarSign, ArrowRight } from "lucide-react";

const STEPS = [
  {
    num: "01",
    title: "Design Your Vibe",
    desc: "Claim your unique URL, upload your logo, and customize your storefront's layout, fonts, and colors to match your aesthetic.",
    icon: Zap,
    color: "from-purple-500 to-indigo-500",
  },
  {
    num: "02",
    title: "Create the Hype",
    desc: "Schedule your drop. Tease it on socials. Our system handles the countdown and locks the store until the moment you go live.",
    icon: Box,
    color: "from-pink-500 to-rose-500",
  },
  {
    num: "03",
    title: "Secure the Bag",
    desc: "Watch orders fly in real-time. We handle payment processing and instant payouts so you can focus on the next big thing.",
    icon: DollarSign,
    color: "from-amber-500 to-orange-500",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-32 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">
              FROM ZERO TO <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                SOLD OUT
              </span>
              .
            </h2>
            <p className="text-xl text-zinc-400">
              We've stripped away the complexity of e-commerce. You just bring
              the heat.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-orange-500/50 -z-10" />

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative group"
            >
              <div
                className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} p-0.5 mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500`}
              >
                <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center relative overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-20`}
                  />
                  <step.icon className="text-white relative z-10" size={32} />
                </div>
              </div>

              <span className="text-6xl font-black text-white/5 absolute -top-4 right-4 select-none">
                {step.num}
              </span>

              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                {step.title}
                {i !== 2 && (
                  <ArrowRight className="md:hidden text-zinc-600" size={16} />
                )}
              </h3>
              <p className="text-zinc-400 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
