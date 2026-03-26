"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams } from "next/navigation";

interface StoreTheme {
  backgroundColor?: string;
  primaryColor?: string;
  fontFamily?: string;
  cardSize?: "small" | "medium" | "large";

  hero?: {
    enabled?: boolean;
    layout?: "left" | "center" | "right";
    headline?: string;
    subheadline?: string;
    headlineColor?: string;
    backgroundImages?: string[];
    overlayOpacity?: number;
    headlineFont?: string;
    subheadlineFont?: string;
  };

  footer?: {
    enabled?: boolean;
    text?: string;
    socials?: {
      instagram?: string;
      twitter?: string;
      tiktok?: string;
    };
    contact?: {
      email?: string;
      address?: string;
    };
  };

  // Legacy/Fallback fields
  heroText?: string;
  footerText?: string;
}

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  logo?: string; // Root level logo
  theme: StoreTheme;
  status: "live" | "maintenance" | "unpaid";
  isVerified?: boolean;
  isSuspended?: boolean; // Admin Override
  onboardingStatus?: "pending" | "approved" | "rejected" | "needs_more_info";
  onboardingNotes: string;
  plan?: string;
  payoutConfig?: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    recipientCode: string;
    provider: "momo" | "bank";
    network?: string;
  };
}

interface StoreContextType {
  store: StoreConfig | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const storeId = params?.storeId as string;

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStoreConfig = async () => {
    if (!storeId) return;

    setLoading(true);
    setError(null);
    try {
      const docRef = doc(db, "stores", storeId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const storeData = {
          id: docSnap.id,
          ...docSnap.data(),
        } as StoreConfig;
        setStore(storeData);

        // Save to local storage for redirection
        if (typeof window !== "undefined") {
          localStorage.setItem("copdrop_last_visited_store", storeId);
        }
      } else {
        setError("Store not found");
        setStore(null);
      }
    } catch (err) {
      console.error("Error fetching store:", err);
      setError("Failed to load store");
      setStore(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreConfig();
  }, [storeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Store Not Found</h1>
          <p className="text-zinc-500">
            The store you are looking for does not exist.
          </p>
        </div>
      </div>
    );
  }

  if (store.isSuspended) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="text-3xl font-black mb-2">Store Suspended</h1>
        <p className="text-zinc-500 max-w-md">
          This store has been temporarily suspended by the platform
          administration. Please contact support for more information.
        </p>
      </div>
    );
  }

  const isApproved = !store.onboardingStatus || store.onboardingStatus === "approved";

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        </div>
        <h1 className="text-3xl font-black mb-2">Store Under Review</h1>
        <p className="text-zinc-500 max-w-md">
          This store is currently being reviewed by our compliance team. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{ store, loading, error, refreshConfig: fetchStoreConfig }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
