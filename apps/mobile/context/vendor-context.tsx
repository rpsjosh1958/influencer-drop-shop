import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

interface Metrics {
  revenue: number;
  totalOrders: number;
  activeOrders: number;
}

interface VendorContextType {
  store: any | null;
  orders: any[];
  products: any[];
  metrics: Metrics;
  loading: boolean;
  toggleStoreStatus: () => Promise<void>;
  refreshStore: () => Promise<any>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export function VendorProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState<Metrics>({
    revenue: 0,
    totalOrders: 0,
    activeOrders: 0,
  });

  // 1. Auth Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setStore(null);
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  // 2. Store Listener
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "stores"), where("ownerId", "==", user.uid));

    const unsubStore = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        setStore({ id: d.id, ...d.data() });
      } else {
        setStore(null);
      }
      setLoading(false);
    });

    return () => unsubStore();
  }, [user]);

  // 3. Orders & Products Listener (Dependent on Store ID)
  useEffect(() => {
    if (!store?.id) return;

    // Orders Listener
    const ordersQuery = query(
      collection(db, "stores", store.id, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const items: any[] = [];
      let revenue = 0;
      let activeCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ id: doc.id, ...data });

        const isPaid = [
          "paid",
          "processing",
          "packaged",
          "sent-out",
          "shipped",
          "delivered",
          "completed",
        ].includes(data.status);

        if (isPaid) {
          revenue += data.total || 0;
        }

        const isActive = [
          "paid",
          "processing",
          "packaged",
          "sent-out",
          "pending",
        ].includes(data.status);

        if (isActive) activeCount++;
      });

      setOrders(items);
      setMetrics((prev) => ({
        ...prev,
        revenue,
        totalOrders: items.length,
        activeOrders: activeCount,
      }));
    });

    // Products Listener
    const productsQuery = query(
      collection(db, "stores", store.id, "products"),
      orderBy("createdAt", "desc")
    );

    const unsubProducts = onSnapshot(productsQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(items);
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, [store?.id]);

  const toggleStoreStatus = async () => {
    if (!store?.id) return;
    const newStatus = store.status === "live" ? "maintenance" : "live";
    try {
      await updateDoc(doc(db, "stores", store.id), {
        status: newStatus,
      });
    } catch (e) {
      console.error("Failed to toggle status", e);
      throw e;
    }
  };

  const refreshStore = async () => {
    return new Promise((resolve) => setTimeout(resolve, 500));
  };

  return (
    <VendorContext.Provider
      value={{
        store,
        orders,
        products,
        metrics,
        loading,
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
