"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, ShoppingBag } from "lucide-react";
import { collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface HeaderSearchProps {
  onAddToCart?: (product: any, variant?: any) => void;
}

export function HeaderSearch({ onAddToCart }: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useBodyScrollLock(isOpen && queryText.length > 0);

  useEffect(() => {
    // Prefetch products for client-side filtering speed
    async function fetchProducts() {
      if (allProducts.length > 0) return;
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllProducts(items);
      } catch (error) {
        console.error("Failed to fetch products for search", error);
      }
    }
    if (isOpen) {
      fetchProducts();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        queryText === ""
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [queryText]);

  const handleSearch = (text: string) => {
    setQueryText(text);
    if (!text.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    // Simple client-side search for speed and case-insensitivity
    try {
      const lower = text.toLowerCase();
      const filtered = allProducts.filter((p: any) =>
        p.name.toLowerCase().includes(lower)
      );
      setResults(filtered.slice(0, 5)); // Limit to 5 results for dropdown
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQueryText("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Backdrop Blur */}
      <AnimatePresence>
        {isOpen && queryText.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false);
              setQueryText("");
            }}
          />
        )}
      </AnimatePresence>

      <div ref={containerRef} className="relative z-40 flex items-center">
        <motion.div
          initial={false}
          animate={{ width: isOpen ? 300 : 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`flex items-center overflow-hidden h-10 rounded-full transition-colors ${
            isOpen
              ? "bg-zinc-100 border border-zinc-200"
              : "hover:bg-zinc-100 bg-transparent"
          }`}
        >
          {/* Search Icon / Button */}
          <button
            onClick={() => {
              if (!isOpen) setIsOpen(true);
            }}
            className="h-10 w-10 flex items-center justify-center shrink-0 text-zinc-500"
          >
            <Search size={20} />
          </button>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search..."
            className={`bg-transparent outline-none h-full w-full text-sm placeholder:text-zinc-400 ${
              isOpen ? "px-2" : "px-0"
            }`}
            style={{ opacity: isOpen ? 1 : 0 }}
          />

          {/* Clear / Close Button */}
          {isOpen && (
            <button
              onClick={() => {
                if (queryText) {
                  handleClear();
                } else {
                  setIsOpen(false);
                }
              }}
              className="h-10 w-10 flex items-center justify-center shrink-0 text-zinc-400 hover:text-black"
            >
              <X size={16} />
            </button>
          )}
        </motion.div>

        {/* Dropdown Results */}
        <AnimatePresence>
          {isOpen && queryText && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-[340px] bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden"
            >
              <div className="p-2">
                {loading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="animate-spin text-zinc-400" size={20} />
                  </div>
                ) : results.length > 0 ? (
                  <div className="flex flex-col">
                    <p className="text-[10px] uppercase font-bold text-zinc-400 px-3 py-2">
                      Products
                    </p>
                    {results.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-2 hover:bg-zinc-50 rounded-lg cursor-pointer transition-colors"
                        onClick={() => {
                          // Handle interaction - maybe minimal view or add to cart?
                          // Since it's a quick search, maybe just logging or trying to add to cart if function exists?
                          // Or we could navigate to a product page if we had one.
                          // For now, let's assume direct add logic if provided, or console log.
                          if (onAddToCart) {
                            onAddToCart(product);
                            setIsOpen(false);
                            setQueryText("");
                          }
                        }}
                      >
                        <div className="h-10 w-10 rounded bg-zinc-100 overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={product.images?.[0] || "/placeholder.png"}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            GHS {product.price}
                          </p>
                        </div>
                        {onAddToCart && (
                          <button className="h-8 w-8 rounded-full bg-black text-white flex items-center justify-center shrink-0">
                            <ShoppingBag size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-6 text-zinc-400 text-xs">
                    No result found.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
