"use client";

import { motion } from "framer-motion";
import { Sparkles, Bot, ArrowRight, BarChart3, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function LandingAiShowcase() {
  return (
    <section className="py-32 bg-black relative overflow-hidden">
      {/* Background Gradient / Noise */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles size={12} />
            Your Store Runs Itself.
          </div>
          <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            While They're Doing It Manual, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-white">
              You're On Autopilot.
            </span>
          </h2>
          <p className="text-xl text-zinc-400 leading-relaxed">
            Stop digging through menus. Just ask.
            <br />
            From analyzing sales trends to managing inventory, your new AI
            partner is always on call.
          </p>
        </div>

        {/* Main Showcase Grid */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Interactive/Visual Demo Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Device Frame Placeholder */}
            <div className="relative aspect-[4/3] bg-zinc-900 rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden flex items-center justify-center group">
              {/* This is where the user will put their recording */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black p-8 flex flex-col">
                {/* Fake Chat Interface */}
                <div className="flex-1 space-y-4">
                  <ChatMessage
                    role="user"
                    text="How are my sales performing this week?"
                  />
                  <ChatMessage
                    role="ai"
                    text="Your sales are up 24% from last week! You've sold 142 items, with 'Vintage Levis' being your top seller. Total revenue: GH₵ 12,450."
                    isAnimated
                  />
                  <ChatMessage
                    role="user"
                    text="Great! Apply a 15% discount to the Levis products."
                  />
                  <ChatMessage
                    role="ai"
                    text="Done! Created code LEVIS15. Would you like me to Broadcast this promo?"
                    isAnimated
                    delay={1.5}
                  />
                </div>

                {/* Simulated Input Area */}
                <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-2 opacity-50">
                  <div className="h-10 bg-zinc-800 rounded-xl flex-1" />
                  <div className="h-10 w-10 bg-purple-600 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Decorative Glow Hook */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-3xl blur opacity-20 -z-10"></div>
          </motion.div>

          {/* Right: Feature List */}
          <div className="space-y-8">
            <FeatureItem
              icon={<Bot className="text-purple-400" />}
              title="Natural Language Control"
              description="Forget complex menus. Just type 'Update stock for Jordans to 50' or 'Close the store' and it happens instantly."
            />
            <FeatureItem
              icon={<BarChart3 className="text-pink-400" />}
              title="Instant Financial Insights"
              description="Get real-time breakdowns of your revenue, pending payouts, and top-selling items without exporting CSVs."
            />
            <FeatureItem
              icon={<Zap className="text-yellow-400" />}
              title="Automated Actions"
              description="Update order statuses in bulk, and manage categories simply by chatting."
            />

            <div className="pt-4">
              <Link href="/create-store">
                <button className="px-8 py-4 bg-white text-black rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform">
                  Available on Growth Plan <ArrowRight size={18} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChatMessage({
  role,
  text,
  isAnimated = false,
  delay = 0,
}: {
  role: "user" | "ai";
  text: string;
  isAnimated?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={isAnimated ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
      whileInView={isAnimated ? { opacity: 1, y: 0 } : {}}
      viewport={{ once: true }}
      transition={{ delay }}
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm ${
          role === "user"
            ? "bg-zinc-800 text-white rounded-tr-sm"
            : "bg-purple-500/10 border border-purple-500/20 text-purple-100 rounded-tl-sm backdrop-blur-md"
        }`}
      >
        <p>{text}</p>
      </div>
    </motion.div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-default"
    >
      <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-zinc-400 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
}
