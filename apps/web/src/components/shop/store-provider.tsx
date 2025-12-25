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
  plan?: string;
}

interface StoreContextType {
  store: StoreConfig | null;
  loading: boolean;
  error: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const storeId = params?.storeId as string;

  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;

    const fetchStore = async () => {
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
        }
      } catch (err) {
        console.error("Error fetching store:", err);
        setError("Failed to load store");
      } finally {
        setLoading(false);
      }
    };

    fetchStore();
  }, [storeId]);

  return (
    <StoreContext.Provider value={{ store, loading, error }}>
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
