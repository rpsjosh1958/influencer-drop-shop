import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  type?: "product" | "service" | "hybrid";
  logo?: string;
  isVerified?: boolean;
  plan?: "starter" | "growth";
  status: "live" | "maintenance" | "closed";
  rating?: number;
  reviewCount?: number;
  ratingDistribution?: Record<string, number>;
  theme?: {
    primaryColor: string;
    backgroundColor: string;
    fontFamily: string;
    cardSize: "small" | "medium" | "large";
    hero?: {
      enabled: boolean;
      layout: "left" | "center" | "right";
      headline: string;
      subheadline: string;
      headlineColor: string;
      headlineFont: string;
      subheadlineFont: string;
      backgroundType?: "color" | "image";
      backgroundImage?: string; // Legacy or single
      backgroundImages?: string[]; // New array
      overlayOpacity?: number;
    };
    footer?: {
      enabled: boolean;
      text: string;
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
  };
  delivery?: {
    days?: string[];
    estimate?: string;
  };
  announcement?: {
    enabled?: boolean;
    text?: string;
    color?: string;
  };
}

interface StoreContextType {
  storeId: string | null;
  setStoreId: (id: string) => Promise<void>;
  store: StoreConfig | null;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const STORAGE_KEY = "copdrop_active_store_id";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreIdState] = useState<string | null>(null);
  // Whether the persisted store id has been read yet.
  const [hydrated, setHydrated] = useState(false);
  // The last snapshot, tagged with the id it's for. Only exposed once it
  // matches storeId, so while a store loads (first launch, or right after
  // switching) `store` is null and `loading` is true — never the previous
  // store's data, and never an empty store that reads as "closed".
  const [snapshot, setSnapshot] = useState<{
    storeId: string;
    store: StoreConfig | null;
  } | null>(null);
  const store = snapshot && snapshot.storeId === storeId ? snapshot.store : null;
  const loading =
    !hydrated || (storeId !== null && snapshot?.storeId !== storeId);

  // 1. Load persisted store ID on mount
  useEffect(() => {
    const loadStoreId = async () => {
      try {
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedId) {
          setStoreIdState(savedId);
        } else {
          // Default fallback if no store is selected
          const defaultId = "default-store"; // Or fetch from config
          await AsyncStorage.setItem(STORAGE_KEY, defaultId);
          setStoreIdState(defaultId);
        }
      } catch (e) {
        console.error("Failed to load store ID", e);
      } finally {
        setHydrated(true);
      }
    };
    loadStoreId();
  }, []);

  // 2. Fetch Store Data when storeId changes
  useEffect(() => {
    console.log("[StoreProvider] storeId changed:", storeId);
    if (!storeId) return;

    const unsub = onSnapshot(
      doc(db, "stores", storeId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log("[StoreProvider] Fetched store data:", data.name);
          setSnapshot({ storeId, store: { id: doc.id, ...data } as StoreConfig });
        } else {
          console.log("[StoreProvider] Store not found for ID:", storeId);
          setSnapshot({ storeId, store: null });
        }
      },
      (error) => {
        console.error("Error fetching store:", error);
        setSnapshot({ storeId, store: null });
      },
    );

    return () => unsub();
  }, [storeId]);

  // 3. Wrapper to save store ID correctly
  const setStoreId = async (id: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, id);
      setStoreIdState(id);
    } catch (e) {
      console.error("Failed to save store ID", e);
    }
  };

  return (
    <StoreContext.Provider value={{ storeId, setStoreId, store, loading }}>
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
