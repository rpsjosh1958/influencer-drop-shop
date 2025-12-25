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
  logo?: string;
  isVerified?: boolean;
  plan?: "starter" | "growth";
  status: "live" | "maintenance";
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
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);

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
      }
    };
    loadStoreId();
  }, []);

  // 2. Fetch Store Data when storeId changes
  useEffect(() => {
    console.log("[StoreProvider] storeId changed:", storeId);
    if (!storeId) {
      setStore(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "stores", storeId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log("[StoreProvider] Fetched store data:", data.name);
          setStore({ id: doc.id, ...data } as StoreConfig);
        } else {
          console.log("[StoreProvider] Store not found for ID:", storeId);
          setStore(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching store:", error);
        setLoading(false);
      }
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
