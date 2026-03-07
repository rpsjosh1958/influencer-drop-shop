"use client";

import { useChat } from "ai/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { ShareModal } from "@/components/admin/share-modal";
import { Bot, X, Send, Sparkles, ChevronDown } from "lucide-react";
import { auth } from "@/lib/firebase";
import { AnimatePresence, motion } from "framer-motion";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { Product } from "@/types";

export function AiAssistant() {
  const { storeId, storePlan } = useAdminStore();
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Promo State
  const [promoProduct, setPromoProduct] = useState<Product | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);

  // Tooltip Logic
  useEffect(() => {
    if (isOpen) {
      return;
    }

    // Initial show after 2 seconds
    const initialTimer = setTimeout(() => {
      setShowTooltip(true);
    }, 2000);

    return () => clearTimeout(initialTimer);
  }, [isOpen]);

  // Handle auto-hide whenever tooltip is shown
  useEffect(() => {
    if (showTooltip) {
      const hideTimer = setTimeout(() => {
        setShowTooltip(false);
      }, 8000); // Hide after 8 seconds
      return () => clearTimeout(hideTimer);
    }
  }, [showTooltip]);

  // Re-show tooltip on hover if chat is not open
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isHovered && !isOpen) {
      timer = setTimeout(() => setShowTooltip(true), 0);
    }
    return () => clearTimeout(timer);
  }, [isHovered, isOpen]);

  // Get ID Token for Auth
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      user.getIdToken().then(setToken);
    }
  }, []);

  // AI SDK 3.x useChat
  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/chat",
      body: { idToken: token, storeId: storeId || "unknown" },
    });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const assistantRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Small delay for animation
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        assistantRef.current &&
        !assistantRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Helper to parse promo data
  const renderMessageContent = useCallback((content: string) => {
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
        console.error("Error parsing promo data:", e);
        return (
          <p className="text-red-500 text-xs">Error parsing promo data.</p>
        );
      }
    }
    return <div className="whitespace-pre-wrap">{content}</div>;
  }, []);

  if (storePlan !== "growth") {
    return null;
  }

  return (
    <>
      <div ref={assistantRef}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 h-[500px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden z-[100]"
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
                      Try asking: &quot;How are my sales?&quot; or &quot;Close the store&quot;.
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
                onSubmit={(e) => {
                  handleSubmit(e);
                }}
                className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800"
              >
                <div className="relative flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        const form = e.currentTarget.closest("form");
                        if (form) form.requestSubmit();
                      }
                    }}
                    placeholder="Ask anything..."
                    rows={1}
                    className="w-full pl-4 pr-12 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium resize-none min-h-[44px] max-h-[120px] overflow-y-auto"
                    style={{ height: "auto" }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 bottom-1.5 p-2 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tooltip Chat Bubble */}
        <AnimatePresence>
          {showTooltip && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9, x: -20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: 10, scale: 0.9, x: -20 }}
              onClick={() => {
                setIsOpen(true);
                setShowTooltip(false);
              }}
              className="fixed bottom-24 right-6 bg-white dark:bg-white border border-zinc-200 dark:border-zinc-800 px-5 py-3.5 rounded-3xl rounded-br-sm shadow-2xl z-[95] cursor-pointer group max-w-[200px] md:max-w-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-lg">
                  <Bot size={16} />
                </div>
                <p className="text-sm font-medium text-black leading-tight">
                  Hi! I&apos;m your assistant, how can I help you today?
                </p>
              </div>
              {/* Tooltip Arrow */}
              <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white dark:bg-white border-r border-b border-zinc-200 dark:border-zinc-800 rotate-45 rounded-sm shadow-[2px_2px_2px_rgba(0,0,0,0.02)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setShowTooltip(false);
          }}
          className="fixed bottom-6 right-6 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full shadow-2xl flex items-center justify-center z-[90] hover:shadow-purple-500/25 transition-shadow"
        >
          {isOpen ? <X size={24} /> : <Sparkles size={24} />}
        </motion.button>
      </div>

      {/* Share Modal */}
      {promoProduct && (
        <ShareModal
          isOpen={promoOpen}
          onClose={() => setPromoOpen(false)}
          product={promoProduct}
          storeSlug={storeId || ""}
           storeName="Store"
          storeLogo=""
        />
      )}
    </>
  );
}
