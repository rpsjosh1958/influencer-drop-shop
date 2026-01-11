"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Mail } from "lucide-react";

interface StoreSuccessModalProps {
  isOpen: boolean;
  onContinue: () => void;
  userEmail: string;
}

export function StoreSuccessModal({
  isOpen,
  onContinue,
  userEmail,
}: StoreSuccessModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl overflow-hidden"
          >
            {/* Header Art */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-green-400 to-emerald-600 opacity-10" />

            <div className="relative z-10">
              <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white">
                <Check size={40} strokeWidth={3} />
              </div>

              <h2 className="text-3xl font-black mb-4 tracking-tight">
                Store Created!
              </h2>

              <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 mb-6 text-left">
                <div className="flex items-start gap-3 mb-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                    <Mail size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 text-lg">
                      Verify Email
                    </h3>
                    <p className="text-sm text-zinc-500 leading-relaxed mt-1">
                      We sent a confirmation link to{" "}
                      <span className="font-bold text-zinc-900">
                        {userEmail}
                      </span>
                      .
                    </p>
                  </div>
                </div>
                <div className="pl-[52px]">
                  <p className="text-xs font-medium text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    ⚠️ Not in inbox? Please check your <b>Spam</b> or{" "}
                    <b>Junk</b> folder.
                  </p>
                </div>
              </div>

              <button
                onClick={onContinue}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
