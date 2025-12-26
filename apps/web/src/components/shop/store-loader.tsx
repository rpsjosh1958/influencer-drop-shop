"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";

export function StoreLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white">
      <div className="relative">
        {/* Drop Animation */}
        <motion.div
          initial={{ y: -200, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            duration: 1.5,
          }}
          className="relative z-10"
        >
          <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl shadow-cyan-500/20">
            <Package size={48} className="text-white" strokeWidth={1.5} />
          </div>
        </motion.div>

        {/* Impact Ripple/Glow */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: [0, 0.5, 0] }}
          transition={{
            delay: 0.2, // Wait for drop
            duration: 1,
            repeat: Infinity,
            repeatDelay: 2,
          }}
          className="absolute inset-0 bg-cyan-500/30 rounded-full blur-xl -z-10"
        />
      </div>

      {/* Text Animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-8 text-center space-y-2"
      >
        <h2 className="text-2xl font-black tracking-tighter uppercase">
          Loading Store
        </h2>
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-zinc-500 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
