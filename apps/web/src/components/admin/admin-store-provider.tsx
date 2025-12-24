"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";

interface AdminStoreContextType {
  storeId: string | null;
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const userData = userDoc.data();
          const stores = userData?.ownedStores || [];

          if (stores.length > 0) {
            setStoreId(stores[0]); // Default to first store for now
          }
        } catch (e) {
          console.error("Failed to load admin store", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <AdminStoreContext.Provider value={{ storeId, loading }}>
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
