"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import {
  collectionGroup,
  query,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";
import {
  Loader2,
  Search,
  Zap,
  Store as StoreIcon,
  Filter,
  Check,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Simplified Product Type for Search Results
interface SearchResult {
  id: string;
  name: string;
  price: number;
  images: string[];
  imageUrl: string;
  storeId: string; // Creates the link /shop/[storeId]
  storeName?: string; // Optional if we fetch it separately, but we might not have it on the product doc
  type: "product" | "service";
}

function SearchContent() {
  const searchParams = useSearchParams();
  const queryStr = searchParams.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Filter State
  const [filterType, setFilterType] = useState<"all" | "product" | "service">(
    "all",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });

  useEffect(() => {
    async function searchGlobal() {
      setLoading(true);
      try {
        const qProducts = query(
          collectionGroup(db, "products"),
          orderBy("createdAt", "desc"),
          limit(50),
        );

        const qServices = query(
          collectionGroup(db, "services"),
          orderBy("createdAt", "desc"),
          limit(50),
        );

        const [snapProducts, snapServices] = await Promise.all([
          getDocs(qProducts),
          getDocs(qServices),
        ]);

        const products = snapProducts.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          storeId: d.ref.parent.parent?.id || "",
          type: "product" as const,
        })) as SearchResult[];

        const services = snapServices.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          storeId: d.ref.parent.parent?.id || "",
          type: "service" as const,
        })) as SearchResult[];

        setResults([...products, ...services]);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setLoading(false);
      }
    }

    if (queryStr) {
      searchGlobal();
    } else {
      searchGlobal(); // Show feed if empty
    }
  }, [queryStr]);

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-black text-xl tracking-tighter"
          >
            <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-white">
              <Zap size={16} fill="white" />
            </div>
            THE DROP.
          </Link>

          <div className="flex items-center gap-2 bg-zinc-100 rounded-full px-4 py-2 flex-1 max-w-md mx-6">
            <Search size={16} className="text-zinc-400" />
            <input
              className="bg-transparent outline-none flex-1 text-sm font-medium"
              placeholder="Search across all stores..."
              defaultValue={queryStr}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  window.location.href = `/search?q=${e.currentTarget.value}`;
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-4">
          <h1 className="text-3xl font-black mb-2">
            {queryStr ? `Results for "${queryStr}"` : "Trending Now"}
          </h1>
          <p className="text-zinc-500">{/* Dynamic count will be below */}</p>
        </div>

        {/* Filter Bar */}
        <section className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex md:hidden">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl text-sm font-bold bg-white text-zinc-900"
            >
              <Filter size={14} />
              Filters & Sort
            </button>
          </div>

          <div
            className={`flex flex-col md:flex-row md:items-center gap-4 w-full ${isFilterOpen ? "flex" : "hidden md:flex"}`}
          >
            <div className="flex bg-zinc-100 p-1 rounded-lg self-start">
              {(["all", "product", "service"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase transition-all ${
                    filterType === t
                      ? "bg-white shadow text-black"
                      : "text-zinc-400 hover:text-zinc-600"
                  }`}
                >
                  {t === "all"
                    ? "All"
                    : t === "product"
                      ? "Products"
                      : "Services"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) =>
                  setPriceRange((p) => ({ ...p, min: e.target.value }))
                }
                className="w-20 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium bg-white"
                type="number"
              />
              <span className="text-zinc-300">-</span>
              <input
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) =>
                  setPriceRange((p) => ({ ...p, max: e.target.value }))
                }
                className="w-20 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm font-medium bg-white"
                type="number"
              />
            </div>

            <div className="flex items-center gap-2 md:ml-auto">
              <div className="flex bg-white border border-zinc-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setSortOrder("asc")}
                  className={`px-3 py-2 flex items-center gap-1 hover:bg-zinc-50 ${sortOrder === "asc" ? "bg-zinc-50" : ""}`}
                >
                  <span className="text-xs font-bold text-zinc-600">
                    Price Low
                  </span>
                  {sortOrder === "asc" && (
                    <Check size={12} className="text-black" />
                  )}
                </button>
                <div className="w-px bg-zinc-100" />
                <button
                  onClick={() => setSortOrder("desc")}
                  className={`px-3 py-2 flex items-center gap-1 hover:bg-zinc-50 ${sortOrder === "desc" ? "bg-zinc-50" : ""}`}
                >
                  <span className="text-xs font-bold text-zinc-600">
                    Price High
                  </span>
                  {sortOrder === "desc" && (
                    <Check size={12} className="text-black" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : (
          // Logic to filter and render
          (() => {
            const lowerQ = queryStr.toLowerCase();
            const filtered = results
              .filter((item) => {
                // 1. Text Search
                if (queryStr && !item.name.toLowerCase().includes(lowerQ))
                  return false;
                // 2. Type Filter
                if (filterType !== "all" && item.type !== filterType)
                  return false;
                // 3. Price Filter
                if (priceRange.min && item.price < parseFloat(priceRange.min))
                  return false;
                if (priceRange.max && item.price > parseFloat(priceRange.max))
                  return false;
                return true;
              })
              .sort((a, b) => {
                if (!sortOrder) return 0;
                return sortOrder === "asc"
                  ? a.price - b.price
                  : b.price - a.price;
              });

            if (filtered.length === 0) {
              return (
                <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <h3 className="font-bold text-lg mb-1">No results found</h3>
                  <p className="text-zinc-400 text-sm">
                    Try adjusting filters or search term.
                  </p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {filtered.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      href={`/shop/${product.storeId}?productId=${product.id}`}
                      className="group block"
                    >
                      <div className="aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-3 relative">
                        <Image
                          src={product.images?.[0] || product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {/* Store Badge */}
                        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                          <StoreIcon size={10} /> Visit Store
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-sm leading-tight group-hover:underline decoration-1 underline-offset-2">
                          {product.name}
                        </h3>
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-black">
                            GH₵{product.price}
                          </span>
                          {product.type === "service" && (
                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1 rounded">
                              SERVICE
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}

export default function GlobalSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <Loader2 className="animate-spin text-zinc-300" size={32} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
