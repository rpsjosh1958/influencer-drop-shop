"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronDown, Store as StoreIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Store {
  id: string;
  name: string;
  logo?: string;
}

export function StoreSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentStoreId = params?.storeId as string;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const q = query(
          collection(db, "stores"),
          where("status", "==", "live")
        );
        const snapshot = await getDocs(q);
        const storeData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Store[];
        setStores(storeData);
      } catch (error) {
        console.error("StoreSwitcher: Failed to fetch stores", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  const currentStore = stores.find((s) => s.id === currentStoreId);

  const handleSelect = (storeId: string) => {
    if (storeId === currentStoreId) {
      setIsOpen(false);
      return;
    }
    setIsNavigating(true);
    setIsOpen(false);
    // router.push(`/shop/${storeId}`);
    // Force full reload to avoid state/hydration mismatches during rapid switching in beta
    window.location.href = `/shop/${storeId}`;
  };

  if (loading)
    return <div className="h-6 w-20 bg-zinc-100 rounded animate-pulse" />;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isNavigating}
        className="flex items-center gap-2 font-black tracking-tighter text-xl uppercase hover:opacity-70 transition-opacity"
      >
        {isNavigating ? (
          <Loader2 className="animate-spin" size={20} />
        ) : currentStore?.logo ? (
          <div className="w-8 h-8 relative rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentStore.logo}
              alt="Logo"
              className="object-contain w-full h-full"
            />
          </div>
        ) : (
          <StoreIcon size={20} />
        )}
        <span>{currentStore?.name || "DROP."}</span>
        <ChevronDown
          size={16}
          className={cn("transition-transform", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-56 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-50 py-1"
          >
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleSelect(store.id)}
                className={cn(
                  "w-full px-4 py-3 text-left hover:bg-zinc-50 flex items-center justify-between transition-colors",
                  store.id === currentStoreId && "font-bold bg-zinc-50"
                )}
              >
                <span>{store.name}</span>
                {store.id === currentStoreId && (
                  <div className="w-1.5 h-1.5 bg-black rounded-full" />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
