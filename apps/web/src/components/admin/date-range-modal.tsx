"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Portal } from "@/components/ui/portal";

interface DateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFrom?: Date | null;
  initialTo?: Date | null;
  onApply: (from: Date, to: Date) => void;
}

function toInputValue(d: Date | null | undefined) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function DateRangeModal({
  isOpen,
  onClose,
  initialFrom,
  initialTo,
  onApply,
}: DateRangeModalProps) {
  const [from, setFrom] = useState(toInputValue(initialFrom));
  const [to, setTo] = useState(toInputValue(initialTo));

  useEffect(() => {
    if (isOpen) {
      setFrom(toInputValue(initialFrom));
      setTo(toInputValue(initialTo));
    }
  }, [isOpen, initialFrom, initialTo]);

  const canApply = !!from && !!to && from <= to;

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative z-10 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-xs p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-500">
                  Custom range
                </h3>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">
                    From
                  </label>
                  <input
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-zinc-400 mb-1 block">
                    To
                  </label>
                  <input
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                  />
                </div>
              </div>
              <button
                disabled={!canApply}
                onClick={() => {
                  const f = new Date(`${from}T00:00:00`);
                  const t = new Date(`${to}T23:59:59`);
                  onApply(f, t);
                }}
                className="w-full mt-5 h-11 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              >
                Apply
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
