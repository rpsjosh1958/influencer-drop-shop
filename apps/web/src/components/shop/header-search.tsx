"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Loader2, Globe, Store, ChevronRight } from "lucide-react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { Product, ServiceItem } from "@/types";
import { ProductDetailsModal } from "./product-details-modal";
import { BookingModal } from "./booking-modal";

interface HeaderSearchProps {
  onAddToCart?: (product: any, variant?: any) => void;
  onSearchOpen?: (isOpen: boolean) => void;
}

export function HeaderSearch({ onAddToCart, onSearchOpen }: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Search Scope: 'store' | 'global'
  const [scope, setScope] = useState<"store" | "global">("store");

  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [productToView, setProductToView] = useState<
    Product | ServiceItem | null
  >(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const params = useParams();
  const storeId = params?.storeId as string;

  useBodyScrollLock(isOpen && queryText.length > 0);

  // Fetch Store Products only once when search opens
  useEffect(() => {
    async function fetchStoreProducts() {
      if (storeProducts.length > 0 || !storeId) return;
      try {
        const productsQuery = query(
          collection(db, "stores", storeId, "products"),
          orderBy("createdAt", "desc"),
        );

        const servicesQuery = query(
          collection(db, "stores", storeId, "services"),
          orderBy("createdAt", "desc"),
        );

        const [productsSnapshot, servicesSnapshot] = await Promise.all([
          getDocs(productsQuery),
          getDocs(servicesQuery),
        ]);

        const productList = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          type: "product",
          ...doc.data(),
        }));

        const serviceList = servicesSnapshot.docs.map((doc) => ({
          id: doc.id,
          type: "service",
          ...doc.data(),
        }));

        const combinedItems = [...productList, ...serviceList];

        combinedItems.sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });

        setStoreProducts(combinedItems);
      } catch (error) {
        console.error("Failed to fetch store products", error);
      }
    }

    if (isOpen && scope === "store") {
      fetchStoreProducts();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, scope, storeId, storeProducts.length]);

  useEffect(() => {
    onSearchOpen?.(isOpen);
  }, [isOpen, onSearchOpen]);

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

  // Handle Search Input
  const handleSearch = (text: string) => {
    setQueryText(text);

    if (scope === "global") {
      return;
    }

    if (!text.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const lower = text.toLowerCase();
      const filtered = storeProducts.filter((p: any) =>
        p.name.toLowerCase().includes(lower),
      );
      setResults(filtered.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const executeSearch = () => {
    if (!queryText.trim()) return;

    if (scope === "global") {
      setIsOpen(false);
      router.push(`/search?q=${encodeURIComponent(queryText)}`);
    } else {
      // Currently handled by dropdown clicks
    }
  };

  const handleClear = () => {
    setQueryText("");
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`relative z-40 flex items-center bg-white rounded-full transition-all duration-300 shadow-sm ${
          isOpen
            ? "w-full md:w-100 border border-zinc-200 pl-4 py-1"
            : "hover:bg-zinc-100/50"
        }`}
      >
        {/* Scope Toggle (Only visible when open) */}
        {isOpen && (
          <div className="flex items-center gap-1 mr-2 p-1 bg-zinc-100 rounded-lg shrink-0">
            <button
              onClick={() => setScope("store")}
              className={`p-1.5 rounded-md transition-all ${
                scope === "store"
                  ? "bg-white shadow text-black"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
              title="Search this store"
            >
              <Store size={14} />
            </button>
            <button
              onClick={() => setScope("global")}
              className={`p-1.5 rounded-md transition-all ${
                scope === "global"
                  ? "bg-white shadow text-black"
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
              title="Search globally"
            >
              <Globe size={14} />
            </button>
          </div>
        )}

        {/* Input Area */}
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            value={queryText}
            onChange={(e) => handleSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") executeSearch();
            }}
            placeholder={
              scope === "global"
                ? "Search everywhere..."
                : "Search this store..."
            }
            className="flex-1 bg-transparent outline-none text-sm min-w-0 text-black"
          />
        ) : (
          <button onClick={() => setIsOpen(true)} className="p-2 text-zinc-800">
            <Search size={20} />
          </button>
        )}

        {/* Close / Clear Button */}
        {isOpen && (
          <button
            onClick={() => {
              if (queryText) {
                handleClear();
              } else {
                setIsOpen(false);
              }
            }}
            className="p-2 text-zinc-400 hover:text-black shrink-0"
          >
            <X size={16} />
          </button>
        )}

        {/* Dropdown Results (Store Scope Only) */}
        <AnimatePresence>
          {isOpen && queryText && scope === "store" && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden max-h-[60vh] overflow-y-auto"
            >
              {results.length > 0 ? (
                <div className="py-2">
                  <p className="text-[10px] uppercase font-bold text-zinc-400 px-3 py-2 bg-zinc-50 border-b border-zinc-100">
                    Store Products
                  </p>
                  {results.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-3 hover:bg-zinc-50 cursor-pointer transition-colors border-b border-zinc-50 last:border-0"
                      onClick={() => {
                        setProductToView(product);
                        // Keep search open or close it? Ideally close.
                        // But user might want to search more.
                        // Usually selecting a result closes search.
                        // setIsOpen(false);
                        // Actually, we keep it open so they see the context vs the modal.
                      }}
                    >
                      <div className="h-10 w-10 bg-zinc-100 rounded-md overflow-hidden relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={product.images?.[0] || product.imageUrl}
                          className="object-cover w-full h-full"
                          alt=""
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate text-black">
                          {product.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          GH₵{product.price}
                        </p>
                      </div>
                      <ChevronRight size={14} className="text-zinc-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-zinc-400 text-xs">
                  {loading ? (
                    <Loader2 className="animate-spin mx-auto" />
                  ) : (
                    "No products found."
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {productToView && productToView?.type === "service" ? (
        <BookingModal
          service={productToView as ServiceItem}
          isOpen={!!productToView}
          onClose={() => setProductToView(null)}
          storeId={storeId}
        />
      ) : (
        <ProductDetailsModal
          product={productToView as Product}
          isOpen={!!productToView}
          onClose={() => setProductToView(null)}
        />
      )}
    </>
  );
}
