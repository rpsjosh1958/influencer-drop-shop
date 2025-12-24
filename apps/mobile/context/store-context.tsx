import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: "live" | "maintenance";
  theme?: {
    primaryColor: string;
    heroText: string;
    footerText: string;
  };
}

interface StoreContextType {
  storeId: string;
  store: StoreConfig | null;
  loading: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// For V1, we hardcode the store. In V2, this could come from App config or Deep Link.
const DEFAULT_STORE_ID = "default-store";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [storeId, setStoreId] = useState(DEFAULT_STORE_ID);
  const [store, setStore] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for store config
    const unsub = onSnapshot(doc(db, "stores", storeId), (doc) => {
      if (doc.exists()) {
        setStore({ id: doc.id, ...doc.data() } as StoreConfig);
      } else {
        // Fallback or error state? For now, nothing.
      }
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  return (
    <StoreContext.Provider value={{ storeId, store, loading }}>
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
