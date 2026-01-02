"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

import { onSnapshot } from "firebase/firestore";

interface AdminStoreContextType {
  storeId: string | null;
  storePlan: "starter" | "growth" | null;
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
  const [storePlan, setStorePlan] = useState<"starter" | "growth" | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let storeUnsub: () => void;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          const stores = userData?.ownedStores || [];

          if (stores.length > 0) {
            const currentStoreId = stores[0];
            setStoreId(currentStoreId);

            // Listen to real-time store updates (for plan upgrades)
            storeUnsub = onSnapshot(
              doc(db, "stores", currentStoreId),
              (doc) => {
                if (doc.exists()) {
                  setStorePlan(doc.data()?.plan || "starter");
                }
              }
            );
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
    };
  }, []);

  return (
    <AdminStoreContext.Provider value={{ storeId, storePlan, loading }}>
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
