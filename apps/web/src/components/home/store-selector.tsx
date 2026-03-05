"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingBag, ChevronDown, Check, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Store {
  id: string;
  name: string;
  status?: string;
}

export function StoreSelector() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(
          collection(db, "stores"),
          where("status", "==", "live"),
        );
        const snapshot = await getDocs(q);
        const storeData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Store[];
        setStores(storeData);
      } catch (error) {
        console.error("StoreSelector: Failed to fetch stores", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const handleSelect = (storeId: string) => {
    setIsNavigating(true);
    setIsOpen(false);
    router.push(`/shop/${storeId}`);
  };

  const handleMouseEnter = (storeId: string) => {
    // Prefetch the store page for instant transition
    router.prefetch(`/shop/${storeId}`);
  };

  return (
    <div className="relative w-full md:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isNavigating}
        className="w-full md:w-auto bg-zinc-900 border border-zinc-800 text-white h-14 px-8 rounded-full text-lg font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isNavigating ? <Loader2 className="animate-spin" size={20} /> : <ShoppingBag size={20} />}
        {loading
          ? "Loading Stores..."
          : isNavigating
            ? "Opening Store..."
            : "Shop A Store"}
        <ChevronDown
          size={16}
          className={cn(
            "text-zinc-500 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-50 min-w-[240px]"
          >
            {stores.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm font-medium">
                No live stores found.
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="p-2 sticky top-0 bg-zinc-900 border-b border-zinc-800 z-10">
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      type="text"
                      placeholder="Search stores..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-zinc-800 text-white text-sm py-2 pl-9 pr-3 rounded-lg border border-zinc-700 focus:outline-none focus:border-zinc-500 placeholder-zinc-500"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto py-2">
                  {filteredStores.length === 0 ? (
                    <div className="px-4 py-8 text-center text-zinc-500 text-xs font-bold uppercase tracking-wider">
                      No matches
                    </div>
                  ) : (
                    filteredStores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => handleSelect(store.id)}
                        onMouseEnter={() => handleMouseEnter(store.id)}
                        className="w-full px-4 py-3 text-left hover:bg-zinc-800 flex items-center justify-between group transition-colors"
                      >
                        <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
                          {store.name || "Untitled Store"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
