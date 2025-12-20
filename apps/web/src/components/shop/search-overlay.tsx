"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Loader2 } from "lucide-react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProductCard } from "./product-card";

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: any, variant?: any) => void;
}

export function SearchOverlay({
  isOpen,
  onClose,
  onAddToCart,
}: SearchOverlayProps) {
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]); // Cache for client-side fallback
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);

      // Load all products purely for fallback/suggestions if needed,
      // simplified here to just load once.
      fetchProductsBase();
    } else {
      setQueryText("");
      setResults([]);
    }
  }, [isOpen]);

  const fetchProductsBase = async () => {
    if (allProducts.length > 0) return;
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllProducts(items);
    } catch (e) {
      console.error("Failed to load products for search", e);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!queryText.trim()) return;

    setLoading(true);
    try {
      // Direct Firestore search (Case sensitive mostly)
      const q = query(
        collection(db, "products"),
        where("name", ">=", queryText),
        where("name", "<=", queryText + "\uf8ff")
      );
      const snapshot = await getDocs(q);

      let items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (items.length === 0 && allProducts.length > 0) {
        // Client-side fallback for case-insensitive
        const lower = queryText.toLowerCase();
        items = allProducts.filter((p: any) =>
          p.name.toLowerCase().includes(lower)
        );
      }

      setResults(items);
    } catch (error) {
      console.error("Search error", error);
      // Fallback
      if (allProducts.length > 0) {
        const lower = queryText.toLowerCase();
        const items = allProducts.filter((p: any) =>
          p.name.toLowerCase().includes(lower)
        );
        setResults(items);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center gap-4 p-6 border-b border-zinc-100 dark:border-zinc-800">
            <Search className="text-zinc-400" size={24} />
            <form onSubmit={handleSearch} className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Search drops..."
                className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
              />
            </form>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center pt-20">
                <Loader2 className="animate-spin text-zinc-400" size={32} />
              </div>
            ) : results.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {results.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    index={idx}
                    addToCart={onAddToCart}
                  />
                ))}
              </div>
            ) : queryText && !loading ? (
              <div className="text-center pt-20 text-zinc-400">
                No results found for "{queryText}"
              </div>
            ) : (
              <div className="text-center pt-20 text-zinc-300 dark:text-zinc-700">
                <p className="text-lg font-medium">
                  Type to search for products
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
