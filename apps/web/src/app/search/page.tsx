"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  ArrowRight,
  Store as StoreIcon,
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
}

export default function GlobalSearchPage() {
  const searchParams = useSearchParams();
  const queryStr = searchParams.get("q") || "";

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    async function searchGlobal() {
      setLoading(true);
      try {
        // NOTE: Firestore doesn't support full-text search natively without extensions (Algolia/Meilisearch).
        // For MVP, we fetch recent products from ALL stores and filter client-side.
        // This scales poorly but works for <1000 items.

        // Ensure you have a Composite Index for 'products' collection group if using compound queries.
        // Here we just grab the latest 100 items globally.
        const q = query(
          collectionGroup(db, "products"),
          orderBy("createdAt", "desc"),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const allProducts = snapshot.docs.map((d) => {
          // We need to know who owns this product.
          // In Firestore subcollections, d.ref.parent.parent.id gives us the Store ID!
          const storeId = d.ref.parent.parent?.id || "";
          return {
            id: d.id,
            ...d.data(),
            storeId: storeId, // Critical for linking
          };
        }) as SearchResult[];

        if (!queryStr) {
          setResults(allProducts);
        } else {
          const lowerQ = queryStr.toLowerCase();
          const filtered = allProducts.filter((p) =>
            p.name.toLowerCase().includes(lowerQ)
          );
          setResults(filtered);
        }
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
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">
            {queryStr ? `Results for "${queryStr}"` : "Trending Now"}
          </h1>
          <p className="text-zinc-500">
            {loading
              ? "Searching..."
              : `Found ${results.length} items from various stores.`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-zinc-300" size={32} />
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {results.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/shop/${product.storeId}`} className="group block">
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
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-sm leading-tight group-hover:underline decoration-1 underline-offset-2">
                        {product.name}
                      </h3>
                      <span className="text-xs font-black">
                        GH₵{product.price}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border border-zinc-100">
            <div className="inline-flex h-16 w-16 bg-zinc-100 rounded-full items-center justify-center mb-4">
              <Search size={32} className="text-zinc-300" />
            </div>
            <h3 className="font-bold text-lg mb-1">No results found</h3>
            <p className="text-zinc-400 text-sm">
              Try searching for something else like "T-Shirt" or "Hoodie"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
