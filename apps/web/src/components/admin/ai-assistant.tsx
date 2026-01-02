"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useRef } from "react";
import { ShareModal } from "@/components/admin/share-modal";
import { Bot, X, Send, Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { AnimatePresence, motion } from "framer-motion";
import { useAdminStore } from "@/components/admin/admin-store-provider";

export function AiAssistant() {
  const { storeId, storePlan } = useAdminStore();
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Promo State
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoProduct, setPromoProduct] = useState<any>(null);

  // Get ID Token for Auth
  useEffect(() => {
    if (auth.currentUser) {
      if (auth.currentUser) {
        auth.currentUser.getIdToken().then(setToken);
      }
    }
  }, []);

  // AI SDK 3.x useChat
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: { idToken: token, storeId: storeId || "unknown" },
    });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay for animation
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Helper to parse promo data
  const renderMessageContent = (content: string) => {
    if (content.startsWith("[PROMO_DATA_JSON]")) {
      try {
        const jsonStr = content.replace("[PROMO_DATA_JSON]", "");
        const product = JSON.parse(jsonStr);
        return (
          <div className="mt-2">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800/50">
              <p className="text-xs font-semibold mb-2">
                Ready to convert {product.name}!
              </p>
              <button
                onClick={() => {
                  setPromoProduct(product);
                  setPromoOpen(true);
                }}
                className="w-full py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                Generate Promo Card
              </button>
            </div>
          </div>
        );
      } catch (e) {
        return (
          <p className="text-red-500 text-xs">Error parsing promo data.</p>
        );
      }
    }
    return <div>{content}</div>;
  };

  if (storePlan !== "growth") {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[100]"
          >
            {/* Header */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white">
                  <Bot size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Drop Assistant</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-zinc-500">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50"
              ref={scrollRef}
            >
              {messages.length === 0 && (
                <div className="text-center mt-10 space-y-3">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mx-auto text-purple-600">
                    <Sparkles size={24} />
                  </div>
                  <p className="text-sm text-zinc-500">
                    Hi! I can help you manage your store.
                    <br />
                    Try asking: "How are my sales?" or "Close the store".
                  </p>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${
                    m.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3.5 rounded-2xl text-sm ${
                      m.role === "user"
                        ? "bg-black text-white rounded-tr-sm"
                        : m.role === "function" || m.role === "data" // Handle tool outputs
                        ? "bg-zinc-100 dark:bg-zinc-800 font-mono text-xs text-zinc-500"
                        : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-tl-sm shadow-sm"
                    }`}
                  >
                    {/* Render Content with Promo Check */}
                    {m.content && renderMessageContent(m.content)}

                    {/* Render Tool Name if available (Function Call) */}
                    {m.role === "function" && (
                      <div className="font-bold mb-1 opacity-50">
                        Executed Tool: {m.name}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleSubmit}
              className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800"
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Ask anything..."
                  className="w-full pl-4 pr-12 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center z-[90] hover:shadow-purple-500/25 transition-shadow"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </motion.button>

      {/* Share Modal */}
      {promoProduct && (
        <ShareModal
          isOpen={promoOpen}
          onClose={() => setPromoOpen(false)}
          product={promoProduct}
          storeSlug={storeId || ""} // Use storeId as slug for now (simplified)
          storeName="Store" // We could fetch store name from context if available, or just generic
          storeLogo=""
        />
      )}
    </>
  );
}
