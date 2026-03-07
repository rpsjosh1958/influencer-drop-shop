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
  lowStockCount: number;
}

interface VendorContextType {
  store: any | null;
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
  toggleStoreStatus: () => Promise<void>;
  refreshStore: () => Promise<any>;
}

const VendorContext = createContext<VendorContextType | undefined>(undefined);

export function VendorProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [store, setStore] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]); // Added
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState<Metrics>({
    revenue: 0,
    totalOrders: 0,
    activeOrders: 0,
    lowStockCount: 0,
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

  // 3. Orders, Products, Bookings, Complaints Listener
  useEffect(() => {
    if (!store?.id) return;

    // Complaints Listener
    const complaintsQuery = query(
      collection(db, "stores", store.id, "complaints"),
      orderBy("createdAt", "desc")
    );
    const unsubComplaints = onSnapshot(complaintsQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComplaints(items);
    });

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
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setProducts(items);
      setMetrics((prev) => ({
        ...prev,
        lowStockCount: items.filter((p) => p.stock > 0 && p.stock <= 5).length,
      }));
    });

    // Bookings Listener
    const bookingsQuery = query(
      collection(db, "stores", store.id, "bookings"),
      orderBy("createdAt", "desc")
    );
    const unsubBookings = onSnapshot(bookingsQuery, (snapshot) => {
      setBookings(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Services Listener
    const servicesQuery = query(
      collection(db, "stores", store.id, "services"),
      orderBy("createdAt", "desc")
    );
    const unsubServices = onSnapshot(servicesQuery, (snapshot) => {
      setServices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubOrders();
      unsubProducts();
      unsubBookings();
      unsubComplaints();
      unsubServices();
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
        bookings,
        products,
        services,
        complaints: complaints || [],
        metrics,
        badgeCounts: {
          orders: orders.filter((o) =>
            ["paid", "processing", "packaged"].includes(o.status)
          ).length,
          bookings: bookings.filter((b) => b.status === "pending").length,
          complaints: (complaints || []).filter((c) =>
            ["unread", "open"].includes(c.status)
          ).length,
        },
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
