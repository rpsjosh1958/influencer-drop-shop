"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { StoreType, StoreFeatures } from "@/types";

interface AdminStoreContextType {
  storeId: string | null;
  storeName: string | null;
  storePlan: "starter" | "growth" | null;
  storeType: StoreType | null;
  storeFeatures: StoreFeatures | null;
  pendingBookingsCount: number;
  loading: boolean;
}

const AdminStoreContext = createContext<AdminStoreContextType | undefined>(
  undefined
);

export function AdminStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [storePlan, setStorePlan] = useState<"starter" | "growth" | null>(null);
  const [storeType, setStoreType] = useState<StoreType | null>(null);
  const [storeFeatures, setStoreFeatures] = useState<StoreFeatures | null>(
    null
  );
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let storeUnsub: () => void;
    let bookingsUnsub: () => void;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          const stores = userData?.ownedStores || [];

          if (stores.length > 0) {
            const currentStoreId = stores[0];
            setStoreId(currentStoreId);

            // Listen to real-time store updates
            storeUnsub = onSnapshot(
              doc(db, "stores", currentStoreId),
              (doc) => {
                if (doc.exists()) {
                  const data = doc.data();
                  setStoreName(data?.name || "Store");
                  setStorePlan(data?.plan || "starter");
                  setStoreType(data?.type || "product");

                  // Get features
                  if (data?.features) {
                    setStoreFeatures(data.features);
                  } else {
                    const type = data?.type || "product";
                    setStoreFeatures({
                      hasProducts: type === "product" || type === "hybrid",
                      hasServices: type === "service" || type === "hybrid",
                      hasPreorders: type === "hybrid",
                    });
                  }
                }
              }
            );

            // Listen for pending bookings
            const bookingsQuery = query(
              collection(db, "stores", currentStoreId, "bookings"),
              where("status", "==", "pending")
            );

            bookingsUnsub = onSnapshot(bookingsQuery, (snapshot) => {
              setPendingBookingsCount(snapshot.docs.length);
            });
          }
        } catch (e) {
          console.error("Failed to load admin store", e);
        }
      }
      setLoading(false);
    });

    return () => {
      authUnsub();
      if (storeUnsub) storeUnsub();
      if (bookingsUnsub) bookingsUnsub();
    };
  }, []);

  return (
    <AdminStoreContext.Provider
      value={{
        storeId,
        storeName,
        storePlan,
        storeType,
        storeFeatures,
        pendingBookingsCount,
        loading,
      }}
    >
      {children}
    </AdminStoreContext.Provider>
  );
}

export function useAdminStore() {
  const context = useContext(AdminStoreContext);
  if (context === undefined) {
    throw new Error("useAdminStore must be used within an AdminStoreProvider");
  }
  return context;
}
