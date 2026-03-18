import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from "react";
import {
  collection,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Metrics {
  revenue: number;
  totalOrders: number;
  activeOrders: number;
  lowStockCount: number;
}

interface OwnedStore {
  id: string;
  name: string;
  plan: string;
  status: string;
  createdAt: any;
  isLocked: boolean;
}

interface VendorContextType {
  store: any | null;
  ownedStores: OwnedStore[];
  userPlan: string;
  activeStoreId: string | null;
  orders: any[];
  bookings: any[];
  complaints: any[];
  products: any[];
  services: any[];
  metrics: Metrics;
  badgeCounts: {
    orders: number;
    bookings: number;
    complaints: number;
  };
  loading: boolean;
  isLocked: boolean;
  switchStore: (id: string) => Promise<void>;
  toggleStoreStatus: () => Promise<void>;
  refreshStore: () => Promise<any>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

const ACTIVE_STORE_STORAGE_KEY = "@vendor_active_store_id";

export function VendorProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 1. Auth & Initial Store Selection
  useMountEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const savedId = await AsyncStorage.getItem(ACTIVE_STORE_STORAGE_KEY);
        if (savedId) setActiveStoreId(savedId);
      } else {
        setActiveStoreId(null);
      }
    });
    return unsubAuth;
  });

  // 2. Fetch User Profile (Plan & Store IDs)
  const { data: userData } = useQuery({
    queryKey: ["vendor-user-profile", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const snap = await getDoc(doc(db, "users", user.uid));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!user,
  });

  const userPlan = userData?.plan || "starter";
  const ownedStoreIds = userData?.ownedStores || [];

  // 3. Fetch All Owned Store Objects
  const { data: stores = [], isLoading: storesLoading } = useQuery({
    queryKey: ["vendor-owned-stores", ownedStoreIds],
    queryFn: async () => {
      if (!ownedStoreIds.length) return [];
      
      const q = query(
        collection(db, "stores"), 
        where("ownerId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const fetchedStores = snapshot.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      } as OwnedStore));

      // Sort by age (oldest first)
      return fetchedStores.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
    },
    enabled: ownedStoreIds.length > 0,
  });

  // 4. Compute Managed Stores (Apply Lock Logic)
  const ownedStores = useMemo(() => {
    return stores.map((s, index) => ({
      ...s,
      isLocked: userPlan === "starter" && index > 0
    }));
  }, [stores, userPlan]);

  // 5. Active Store Logic
  const store = useMemo(() => {
    if (!ownedStores.length) return null;
    
    // If we have a saved ID and it's valid
    if (activeStoreId) {
      const found = ownedStores.find(s => s.id === activeStoreId);
      if (found) return found;
    }

    // Default to first store
    return ownedStores[0];
  }, [ownedStores, activeStoreId]);

  const isLocked = !!store?.isLocked;

  // 6. Data Lists (Queries tied to active store)
  const effectiveStoreId = store?.id;

  const { data: orders = [] } = useQuery({
    queryKey: ["vendor-orders", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["vendor-products", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["vendor-bookings", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "bookings"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  const { data: complaints = [] } = useQuery({
    queryKey: ["vendor-complaints", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "complaints"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["vendor-services", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "services"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  // Actions
  const switchStore = async (id: string) => {
    setActiveStoreId(id);
    await AsyncStorage.setItem(ACTIVE_STORE_STORAGE_KEY, id);
    queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-complaints"] });
    queryClient.invalidateQueries({ queryKey: ["vendor-services"] });
  };

  const toggleStoreStatus = async () => {
    if (!effectiveStoreId) return;
    const newStatus = store.status === "live" ? "maintenance" : "live";
    try {
      await updateDoc(doc(db, "stores", effectiveStoreId), {
        status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["vendor-owned-stores"] });
    } catch (e) {
      console.error("Failed to toggle status", e);
      throw e;
    }
  };

  const refreshStore = async () => {
    await queryClient.invalidateQueries({ queryKey: ["vendor-owned-stores"] });
    await queryClient.invalidateQueries({ queryKey: ["vendor-orders", effectiveStoreId] });
    return true;
  };

  // Derived Metrics (remains same logic but tied to queries above)
  const metrics = useMemo<Metrics>(() => {
    let revenue = 0;
    let activeCount = 0;

    orders.forEach((order: any) => {
      const isPaid = ["paid", "processing", "packaged", "sent-out", "shipped", "delivered", "completed"].includes(order.status);
      if (isPaid) revenue += order.total || 0;

      const isActive = ["paid", "processing", "packaged", "sent-out", "pending"].includes(order.status);
      if (isActive) activeCount++;
    });

    const lowStockCount = products.filter((p: any) => p.stock > 0 && p.stock <= 5).length;

    return {
      revenue,
      totalOrders: orders.length,
      activeOrders: activeCount,
      lowStockCount,
    };
  }, [orders, products]);

  const badgeCounts = useMemo(() => ({
    orders: orders.filter((o: any) => ["paid", "processing", "packaged"].includes(o.status)).length,
    bookings: bookings.filter((b: any) => b.status === "pending").length,
    complaints: complaints.filter((c: any) => ["unread", "open"].includes(c.status)).length,
  }), [orders, bookings, complaints]);

  return (
    <VendorContext.Provider
      value={{
        store,
        ownedStores,
        userPlan,
        activeStoreId,
        orders,
        bookings,
        products,
        services,
        complaints,
        metrics,
        badgeCounts,
        loading: storesLoading,
        isLocked,
        switchStore,
        toggleStoreStatus,
        refreshStore,
      }}
    >
      {children}
    </VendorContext.Provider>
  );
}

export function useVendor() {
  const context = useContext(VendorContext);
  if (!context) {
    throw new Error("useVendor must be used within a VendorProvider");
  }
  return context;
}
