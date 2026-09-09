import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
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
  onSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  Order,
  Product,
  Booking,
  Complaint,
  ServiceItem,
  FirestoreTimestamp,
  StoreConfig,
} from "@/types";

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
  createdAt: FirestoreTimestamp;
  isLocked: boolean;
  logo?: string;
  type?: "product" | "service" | "hybrid";
  features?: {
    hasProducts: boolean;
    hasServices: boolean;
    hasPreorders: boolean;
  };
  payoutConfig?: StoreConfig["payoutConfig"];
  pendingRefundDebt?: number;
}

interface VendorContextType {
  store: OwnedStore | null;
  ownedStores: OwnedStore[];
  userPlan: string;
  activeStoreId: string | null;
  orders: Order[];
  bookings: Booking[];
  complaints: Complaint[];
  products: Product[];
  services: ServiceItem[];
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
  refreshStore: () => Promise<boolean>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

const ACTIVE_STORE_STORAGE_KEY = "@vendor_active_store_id";

export function VendorProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // onAuthStateChanged always fires asynchronously — even when a user is
  // already signed in, `user` starts this render cycle as null and only
  // gets set once the callback actually runs. Every navigation into the
  // vendor group re-mounts this provider fresh, so without tracking this
  // separately, `userData`'s query being `enabled: !!user` (still false
  // in that gap) reads as "not loading" — a real vendor with real stores
  // would briefly look like "definitely has zero stores" and get bounced
  // straight back out by the no-store guard in (vendor)/_layout.tsx.
  const [authResolved, setAuthResolved] = useState(false);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 1. Auth & Initial Store Selection
  useMountEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthResolved(true);
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
  const { data: userData, isLoading: userDataLoading } = useQuery({
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
      if (!ownedStoreIds.length || !user) return [];

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

  // Orders/bookings/complaints are the three things badge counts and the
  // dashboard's "Recent Activity" feed are built from, so they need to be
  // genuinely live (onSnapshot) — a one-time getDocs fetch (the old
  // approach here) only ever updated on cold mount or a manual
  // pull-to-refresh, with no realtime listener and no RN AppState/focus
  // wiring on the QueryClient to refetch automatically either. Matches
  // the same onSnapshot pattern the web admin's nav badges already use.
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!effectiveStoreId || isLocked) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }
    setOrdersLoading(true);
    const q = query(
      collection(db, "stores", effectiveStoreId, "orders"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Order[]);
        setOrdersLoading(false);
      },
      (err) => {
        console.error("vendor orders onSnapshot error", err);
        setOrdersLoading(false);
      }
    );
    return unsub;
  }, [effectiveStoreId, isLocked]);

  const { data: products = [], isFetching: productsFetching } = useQuery({
    queryKey: ["vendor-products", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "products"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[];
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  useEffect(() => {
    if (!effectiveStoreId || isLocked) {
      setBookings([]);
      setBookingsLoading(false);
      return;
    }
    setBookingsLoading(true);
    const q = query(
      collection(db, "stores", effectiveStoreId, "bookings"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Booking[]);
        setBookingsLoading(false);
      },
      (err) => {
        console.error("vendor bookings onSnapshot error", err);
        setBookingsLoading(false);
      }
    );
    return unsub;
  }, [effectiveStoreId, isLocked]);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [complaintsLoading, setComplaintsLoading] = useState(true);

  useEffect(() => {
    if (!effectiveStoreId || isLocked) {
      setComplaints([]);
      setComplaintsLoading(false);
      return;
    }
    setComplaintsLoading(true);
    const q = query(
      collection(db, "stores", effectiveStoreId, "complaints"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComplaints(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Complaint[]);
        setComplaintsLoading(false);
      },
      (err) => {
        console.error("vendor complaints onSnapshot error", err);
        setComplaintsLoading(false);
      }
    );
    return unsub;
  }, [effectiveStoreId, isLocked]);

  const { data: services = [], isFetching: servicesFetching } = useQuery({
    queryKey: ["vendor-services", effectiveStoreId],
    queryFn: async () => {
      if (!effectiveStoreId) return [];
      const q = query(collection(db, "stores", effectiveStoreId, "services"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })) as ServiceItem[];
    },
    enabled: !!effectiveStoreId && !isLocked,
  });

  // Actions
  const switchStore = async (id: string) => {
    setActiveStoreId(id);
    await AsyncStorage.setItem(ACTIVE_STORE_STORAGE_KEY, id);
    // Orders/bookings/complaints re-subscribe on their own — their
    // onSnapshot listeners are keyed off effectiveStoreId, which changes
    // as soon as `store` recomputes from the new activeStoreId.
    queryClient.invalidateQueries({ queryKey: ["vendor-products"] });
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
    // Orders/bookings/complaints are already live (onSnapshot) — nothing
    // to invalidate there. Products/services and the owned-stores list are
    // still one-time fetches, so pull-to-refresh still refetches those.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["vendor-owned-stores"] }),
      queryClient.invalidateQueries({ queryKey: ["vendor-products", effectiveStoreId] }),
      queryClient.invalidateQueries({ queryKey: ["vendor-services", effectiveStoreId] }),
    ]);
    return true;
  };

  // Combine all fetching states for a comprehensive loading indicator.
  // !authResolved comes first — until Firebase has actually told us who's
  // signed in, every query below reads as artificially "not loading"
  // (they're all `enabled: false` while `user` is still null), which
  // would otherwise look identical to "genuinely resolved, zero stores."
  // userDataLoading matters on its own too, not just as an input to
  // storesLoading — ownedStoreIds (and therefore whether the owned-stores
  // query even runs) depends on userData having resolved first, so
  // without this a consumer checking "loading is false, ownedStores is
  // empty" could momentarily see a false "no stores" during the brief
  // window before userData itself has loaded.
  const combinedFetching =
    !authResolved ||
    userDataLoading ||
    storesLoading ||
    ordersLoading ||
    productsFetching ||
    bookingsLoading ||
    complaintsLoading ||
    servicesFetching;

  // Derived Metrics (remains same logic but tied to queries above)
  const metrics = useMemo<Metrics>(() => {
    let revenue = 0;
    let activeCount = 0;

    orders.forEach((order) => {
      const isPaid = ["paid", "processing", "packaged", "sent-out", "shipped", "delivered", "completed"].includes(order.status);
      if (isPaid) revenue += order.total || 0;

      const isActive = ["paid", "processing", "packaged", "sent-out", "pending"].includes(order.status);
      if (isActive) activeCount++;
    });

    const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;

    return {
      revenue,
      totalOrders: orders.length,
      activeOrders: activeCount,
      lowStockCount,
    };
  }, [orders, products]);

  const badgeCounts = useMemo(() => ({
    orders: orders.filter((o) => ["paid", "processing", "packaged"].includes(o.status)).length,
    bookings: bookings.filter((b) => b.status === "pending").length,
    complaints: complaints.filter((c) => ["unread", "open"].includes(c.status)).length,
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
        loading: combinedFetching,
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
