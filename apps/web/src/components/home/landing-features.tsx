"use client";

import { motion } from "framer-motion";
import { BarChart3, Smartphone, Layout, Zap, Bell, Globe } from "lucide-react";

const FEATURES = [
  {
    title: "Command Center.",
    description:
      "A powerful dashboard to manage your business. Track sales in real-time, manage inventory, and customize your store's look and feel without writing a single line of code.",
    icon: BarChart3,
    color: "text-purple-500",
    mockup: "dashboard",
    bullets: ["✨ Live Sales Tracker", "✨ Easy Inventory", "✨ Customer Orders"],
  },
  {
    title: "Your Brand, Your Rules.",
    description:
      "Don't just sell, express. Customize fonts, colors, layouts, and banners. Create a storefront that screams your identity while keeping the buying process fast and easy.",
    icon: Layout,
    color: "text-pink-500",
    mockup: "store",
    bullets: ["✨ Visual Editor", "✨ Custom Branding", "✨ Instant Checkout"],
  },
  {
    title: "Your Custom Mobile App.",
    description:
      "Stay in your customer's pocket. Your own custom app for iOS and Android keeps fans engaged with push notifications for drops, blazing fast checkout, and stored payment details.",
    icon: Smartphone,
    color: "text-orange-500",
    mockup: "mobile",
    bullets: [
      "✨ Instant Notifications",
      "✨ Store Switch",
      "✨ One-Tap Checkout",
    ],
  },
];

export function LandingFeatures() {
  return (
    <section
      id="features"
      className="py-32 bg-zinc-950 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-32 space-y-4">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter">
            THE COMPLETE{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-orange-500">
              ECOSYSTEM
            </span>
            .
          </h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            We provide every tool you need to go from idea to sold-out drop in
            minutes.
          </p>
        </div>

        <div className="space-y-32">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className={`flex flex-col md:flex-row items-center gap-12 md:gap-24 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* Text Content */}
              <div className="flex-1 space-y-8">
                <div
                  className={`p-3 rounded-2xl bg-white/5 w-fit ${feature.color}`}
                >
                  <feature.icon size={32} />
                </div>
                <h3 className="text-4xl md:text-5xl font-black tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-xl text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-3 pl-4 border-l-2 border-white/10">
                  {/* @ts-ignore - bullets exist now */}
                  {feature.bullets?.map((bullet: string, idx: number) => (
                    <li key={idx} className="text-zinc-300 font-medium">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mockup Visual */}
              <div className="flex-1 w-full">
                {feature.mockup === "mobile" ? (
                  <div className="relative w-full aspect-square md:aspect-video flex items-center justify-center gap-6">
                    <img
                      src="/assets/landing/image1.png"
                      alt="Mobile App View 1"
                      className="h-[120%] w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                    />
                    <img
                      src="/assets/landing/image2.png"
                      alt="Mobile App View 2"
                      className="h-[120%] w-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-500 delay-100"
                    />
                  </div>
                ) : (
                  <div className="relative aspect-video rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl overflow-hidden group hover:border-white/20 transition-colors duration-500">
                    {/* Abstract UI Representation or Image */}
                    {feature.mockup === "dashboard" ||
                    feature.mockup === "store" ? (
                      <img
                        src={
                          feature.mockup === "dashboard"
                            ? "/assets/landing/adminDashboard.png"
                            : "/assets/landing/shop.png"
                        }
                        alt={feature.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black p-8 flex flex-col">
                        {/* Fallback */}
                      </div>
                    )}

                    {/* Glow effect */}
                    <div
                      className={`absolute -inset-10 bg-gradient-to-r ${feature.color.replace(
                        "text",
                        "from"
                      )}/20 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Simple CSS Mockups for visual interest without screenshots
function MockupDashboard({ color }: { color: string }) {
  const bgClass = color.replace("text-", "bg-");
  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <div className="flex gap-4">
        <div className="w-1/4 h-32 rounded-xl bg-white/5 border border-white/5 p-4 space-y-2">
          <div className={`w-8 h-8 rounded-lg ${bgClass} opacity-20`} />
          <div className="w-12 h-2 rounded-full bg-zinc-800" />
          <div className="w-20 h-6 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="w-1/4 h-32 rounded-xl bg-white/5 border border-white/5 p-4 space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white/10" />
          <div className="w-12 h-2 rounded-full bg-zinc-800" />
          <div className="w-20 h-6 rounded bg-zinc-800" />
        </div>
        <div className="flex-1 h-32 rounded-xl bg-white/5 border border-white/5 p-4">
          <div className="w-full h-full flex items-end gap-2 px-2 pb-2">
            {[40, 70, 50, 90, 60, 80, 100].map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${bgClass} opacity-40`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 rounded-xl bg-white/5 border border-white/5 p-4 flex gap-4">
        <div className="w-1/4 h-full rounded bg-zinc-900/50" />
        <div className="w-3/4 h-full space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex gap-4 items-center h-12 border-b border-white/5"
            >
              <div className="w-8 h-8 rounded bg-zinc-800" />
              <div className="w-32 h-3 rounded bg-zinc-800" />
              <div className="flex-1" />
              <div className="w-16 h-3 rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MockupStore({ color }: { color: string }) {
  const bgClass = color.replace("text-", "bg-");
  return (
    <div className="flex flex-col h-full relative">
      <div className="h-40 w-full rounded-xl bg-zinc-800 relative overflow-hidden mb-6">
        <div
          className={`absolute inset-0 opacity-20 bg-gradient-to-r ${color.replace(
            "text",
            "from"
          )} to-transparent`}
        />
        <div className="absolute bottom-4 left-4">
          <div className="w-32 h-6 rounded bg-white" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[3/4] rounded-lg bg-zinc-800 relative overflow-hidden">
              {i === 2 && (
                <div
                  className={`absolute top-2 right-2 px-2 py-1 rounded text-[8px] bg-black text-white`}
                >
                  SOLD OUT
                </div>
              )}
            </div>
            <div className="w-20 h-2 rounded bg-zinc-800" />
            <div className="w-12 h-2 rounded bg-zinc-800 opacity-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupMobile({ color }: { color: string }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="w-[180px] h-[340px] rounded-[2rem] border-4 border-zinc-800 bg-black overflow-hidden relative shadow-2xl">
        <div className="absolute top-0 inset-x-0 h-6 bg-zinc-900 z-20 flex justify-center">
          <div className="w-20 h-4 bg-black rounded-b-lg" />
        </div>
        {/* App Content */}
        <div className="p-4 pt-8 space-y-4">
          <div className="h-24 w-full rounded-xl bg-zinc-900" />
          <div className="grid grid-cols-2 gap-2">
            <div className="aspect-square bg-zinc-900 rounded-lg" />
            <div className="aspect-square bg-zinc-900 rounded-lg" />
            <div className="aspect-square bg-zinc-900 rounded-lg" />
            <div className="aspect-square bg-zinc-900 rounded-lg" />
          </div>
        </div>
        {/* Notification */}
        <div className="absolute top-10 left-2 right-2 bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10 flex gap-3">
          <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
            <Bell size={12} className="text-white" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="w-20 h-2 bg-white/50 rounded" />
            <div className="w-32 h-2 bg-white/20 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
