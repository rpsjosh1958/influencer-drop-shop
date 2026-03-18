"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ChevronDown,
  Store as StoreIcon,
  Loader2,
  Search,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface Store {
  id: string;
  name: string;
  logo?: string;
  isVerified?: boolean;
}

export function StoreSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentStoreId = params?.storeId as string;

  const [isOpen, setIsOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: stores = [], isLoading: loading } = useQuery({
    queryKey: ["stores", "live"],
    queryFn: async () => {
      const q = query(collection(db, "stores"), where("status", "==", "live"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Store[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const currentStore = stores.find((s) => s.id === currentStoreId);

  const filteredStores = stores.filter((store) =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (storeId: string) => {
    if (storeId === currentStoreId) {
      setIsOpen(false);
      return;
    }
    setIsNavigating(true);
    setIsOpen(false);
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
        {currentStore?.isVerified && (
          <BadgeCheck
            size={18}
            className="text-blue-500"
            fill="currentColor"
            color="white"
          />
        )}
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
            className="absolute top-full left-0 mt-2 w-72 bg-white border border-zinc-100 rounded-xl shadow-xl overflow-hidden z-50 flex flex-col max-h-[400px]"
          >
            {/* Search Bar */}
            <div className="p-2 sticky top-0 bg-white border-b border-zinc-100 z-10">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  placeholder="Find a store..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm text-black focus:outline-none focus:ring-1 focus:ring-black"
                  autoFocus
                />
              </div>
            </div>

            {/* Store List */}
            <div className="overflow-y-auto flex-1 py-1 custom-scrollbar">
              {filteredStores.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-400">
                  No stores found.
                </div>
              ) : (
                filteredStores.map((store) => (
                  <button
                    key={store.id}
                    onClick={() => handleSelect(store.id)}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-zinc-50 flex items-center justify-between transition-colors group",
                      store.id === currentStoreId && "bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {store.logo ? (
                        <img
                          src={store.logo}
                          alt=""
                          className="w-6 h-6 rounded object-contain"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded bg-zinc-100 flex items-center justify-center">
                          <StoreIcon size={12} className="text-zinc-400" />
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "font-medium text-black",
                            store.id === currentStoreId && "font-bold"
                          )}
                        >
                          {store.name}
                        </span>
                        {store.isVerified && (
                          <BadgeCheck
                            size={14}
                            className="text-blue-500"
                            fill="currentColor"
                            color="white"
                          />
                        )}
                      </div>
                    </div>

                    {store.id === currentStoreId && (
                      <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
