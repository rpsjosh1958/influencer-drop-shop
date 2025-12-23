"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "./cart-provider";
import { Check, X } from "lucide-react";

export function AddedToCartToast() {
  const { showAddedToast, setShowAddedToast, lastAddedItem } = useCart();

  useEffect(() => {
    if (showAddedToast) {
      const timer = setTimeout(() => {
        setShowAddedToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showAddedToast, setShowAddedToast]);

  return (
    <AnimatePresence>
      {showAddedToast && lastAddedItem && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="fixed top-6 inset-x-4 md:inset-x-auto md:left-auto md:right-6 md:top-24 z-[70] md:w-full md:max-w-sm pointer-events-none"
        >
          <div className="bg-white text-black border border-zinc-200 rounded-2xl p-4 shadow-2xl flex items-center gap-4 pointer-events-auto">
            {/* Icon */}
            <div className="h-10 w-10 shrink-0 rounded-full bg-black text-white flex items-center justify-center">
              <Check size={20} strokeWidth={3} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm">Added to cart</h4>
              <p className="text-zinc-500 text-xs truncate">
                {lastAddedItem.name}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowAddedToast(false)}
              className="p-1 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-black transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
