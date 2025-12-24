"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShoppingBag, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    const fetchStores = async () => {
      console.log("StoreSelector: Fetching stores...");
      try {
        const q = query(
          collection(db, "stores"),
          where("status", "==", "live") // Only show live stores
        );
        const snapshot = await getDocs(q);
        const storeData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Store[];
        console.log("StoreSelector: Stores fetched:", storeData);
        setStores(storeData);
      } catch (error) {
        console.error("StoreSelector: Failed to fetch stores", error);
        // Fallback or empty state
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelect = (storeId: string) => {
    console.log("StoreSelector: Selected store:", storeId);
    setIsNavigating(true);
    setIsOpen(false);
    router.push(`/shop/${storeId}`);
  };

  return (
    <div className="relative w-full md:w-auto">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isNavigating}
        className="w-full md:w-auto bg-zinc-900 border border-zinc-800 text-white h-14 px-8 rounded-full text-lg font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingBag size={20} />
        {loading
          ? "Loading..."
          : isNavigating
          ? "Redirecting..."
          : "Shop A Store"}
        <ChevronDown
          size={16}
          className={cn(
            "text-zinc-500 transition-transform",
            isOpen && "rotate-180"
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
              <div className="max-h-60 overflow-y-auto py-2">
                {stores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelect(store.id)}
                    className="w-full px-4 py-3 text-left hover:bg-zinc-800 flex items-center justify-between group transition-colors"
                  >
                    <span className="font-bold text-white group-hover:text-purple-400 transition-colors">
                      {store.name || "Untitled Store"}
                    </span>
                    {/* Optional: Add status indicator or check */}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
