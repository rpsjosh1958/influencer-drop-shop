"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ExternalLink, Share2 } from "lucide-react";
import { useAdminStore } from "./admin-store-provider";
import { StoreShareModal } from "./store-share-modal";
import { DateRangeModal } from "./date-range-modal";
import type { Product } from "@/types";

export type DatePreset = "7d" | "30d" | "90d" | "custom";
export interface DateRangeValue {
  preset: DatePreset;
  from: Date;
  to: Date;
}

const PRESET_DAYS: Record<"7d" | "30d" | "90d", number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export function getPresetRange(preset: "7d" | "30d" | "90d"): DateRangeValue {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - PRESET_DAYS[preset]);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { preset, from, to };
}

interface AdminPageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Dashboard-only: shows the 7D/30D/90D/Custom range picker. */
  showDateFilter?: boolean;
  onDateRangeChange?: (range: DateRangeValue) => void;
}

export function AdminPageHeader({
  title,
  subtitle,
  showDateFilter,
  onDateRangeChange,
}: AdminPageHeaderProps) {
  const { storeId, storeName, storeLogo, onboardingStatus, isSuspended } = useAdminStore();
  const queryClient = useQueryClient();
  const [showShareStore, setShowShareStore] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [preset, setPreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);

  const onboardingBlocked = onboardingStatus !== "approved" || isSuspended;

  // Same query key the dashboard/other pages already use for the store doc,
  // so this shares react-query's cache instead of triggering an extra fetch.
  const { data: storeData } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const snap = await getDoc(doc(db, "stores", storeId));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!storeId,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const q = query(
        collection(db, "stores", storeId, "products"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Product[];
    },
    enabled: !!storeId,
  });
  const shareableProducts = allProducts.filter((p) => !!p.imageUrl).slice(0, 3);

  const isLive = storeData?.status === "live";

  const toggleMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) return;
      await updateDoc(doc(db, "stores", storeId), {
        status: isLive ? "maintenance" : "live",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store", storeId] });
    },
    onError: (err) => {
      console.error("Failed to toggle status", err);
    },
  });

  const toggleStore = () => {
    if (!storeId || toggleMutation.isPending || onboardingBlocked) return;
    if (
      isLive &&
      !confirm(
        "Close your storefront? Customers won't be able to browse or check out until you switch it back to Live.",
      )
    ) {
      return;
    }
    toggleMutation.mutate();
  };

  const applyPreset = (p: "7d" | "30d" | "90d") => {
    const range = getPresetRange(p);
    setPreset(range.preset);
    onDateRangeChange?.(range);
  };

  // Fire the default 30D range once, on mount.
  useEffect(() => {
    if (showDateFilter) applyPreset("30d");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDateFilter]);

  const applyCustomRange = (from: Date, to: Date) => {
    setPreset("custom");
    setCustomFrom(from);
    setCustomTo(to);
    onDateRangeChange?.({ preset: "custom", from, to });
    setShowCustomModal(false);
  };

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
      active
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "text-zinc-500 hover:text-black dark:hover:text-white"
    }`;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {showDateFilter && (
          <div className="flex md:inline-flex w-full md:w-auto bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 gap-2">
            <button onClick={() => applyPreset("7d")} className={pillClass(preset === "7d")}>
              Last Week
            </button>
            <button onClick={() => applyPreset("30d")} className={pillClass(preset === "30d")}>
              Last Month
            </button>
            <button onClick={() => applyPreset("90d")} className={pillClass(preset === "90d")}>
              90D
            </button>
            <button
              onClick={() => setShowCustomModal(true)}
              className={pillClass(preset === "custom")}
            >
              Custom
            </button>
          </div>
        )}

        {storeId && (
          <a
            href={`/shop/${storeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[9px] font-black uppercase tracking-wide text-zinc-500 hover:text-black dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-500 bg-white dark:bg-zinc-900 whitespace-nowrap"
          >
            <ExternalLink size={11} />
            <span>View Store</span>
          </a>
        )}

        {storeId && (
          <button
            onClick={() => setShowShareStore(true)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[9px] font-black uppercase tracking-wide text-zinc-500 hover:text-black dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-500 bg-white dark:bg-zinc-900 whitespace-nowrap"
          >
            <Share2 size={11} />
            <span>Share Store</span>
          </button>
        )}

        <button
          onClick={toggleStore}
          disabled={toggleMutation.isPending || onboardingBlocked}
          className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wide transition-colors whitespace-nowrap ${
            isLive
              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400"
          } ${onboardingBlocked ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full animate-pulse shrink-0 ${
              isLive ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>{isLive ? "Store Open" : "Store Closed"}</span>
        </button>
      </div>

      {storeId && (
        <StoreShareModal
          isOpen={showShareStore}
          onClose={() => setShowShareStore(false)}
          storeSlug={storeId}
          storeName={storeName || ""}
          storeLogo={storeLogo || undefined}
          products={shareableProducts}
        />
      )}

      {showDateFilter && (
        <DateRangeModal
          isOpen={showCustomModal}
          onClose={() => setShowCustomModal(false)}
          initialFrom={customFrom}
          initialTo={customTo}
          onApply={applyCustomRange}
        />
      )}
    </div>
  );
}
