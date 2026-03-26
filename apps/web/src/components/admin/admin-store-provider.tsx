"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { StoreType, StoreFeatures } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

interface StoreListItem {
  id: string;
  name: string;
  plan: "starter" | "growth";
  status: string;
  isLocked?: boolean;
}

interface AdminStoreContextType {
  storeId: string | null;
  storeName: string | null;
  userPlan: "starter" | "growth" | null;
  planExpiresAt: any | null;
  storeType: StoreType | null;
  storeFeatures: StoreFeatures | null;
  pendingBookingsCount: number;
  onboardingStatus: "pending" | "approved" | "rejected" | "needs_more_info";
  onboardingNotes: string | null;
  isSuspended: boolean;
  loading: boolean;
  ownedStores: StoreListItem[];
  switchStore: (id: string) => void;
  refreshStore: () => Promise<void>;
}

const AdminStoreContext = createContext<AdminStoreContextType | undefined>(
  undefined
);

export function AdminStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<"starter" | "growth" | null>(null);
  const [planExpiresAt, setPlanExpiresAt] = useState<any | null>(null);
  const [storeType, setStoreType] = useState<StoreType | null>(null);
  const [storeFeatures, setStoreFeatures] = useState<StoreFeatures | null>(null);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [onboardingStatus, setOnboardingStatus] = useState<"pending" | "approved" | "rejected" | "needs_more_info">("approved");
  const [onboardingNotes, setOnboardingNotes] = useState<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [ownedStores, setOwnedStores] = useState<StoreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Persistance & Selection Logic
  const switchStore = useCallback((id: string) => {
    setActiveStoreId(id);
    localStorage.setItem("activeStoreId", id);
    // Invalidate all admin queries to force refetch for new store
    queryClient.invalidateQueries();
  }, [queryClient]);

  const refreshStore = async () => {
    if (activeStoreId) {
      queryClient.invalidateQueries();
    }
  };

  useEffect(() => {
    let userUnsub: () => void;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Listen to User Document for account-wide plan and ownedStores
        userUnsub = onSnapshot(doc(db, "users", user.uid), async (userSnap) => {
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const storeIds = userData?.ownedStores || [];
            
            // Sync Account Plan
            const rawPlan = userData?.plan || "starter";
            const expiry = userData?.planExpiresAt;
            
            // Check if expired locally
            let isExpired = false;
            if (expiry) {
              const expiryDate = expiry.toDate ? expiry.toDate() : new Date(expiry.seconds * 1000);
              if (new Date() > expiryDate) {
                isExpired = true;
              }
            }

            const activePlan = (rawPlan === "growth" && !isExpired) ? "growth" : "starter";
            setUserPlan(activePlan);
            setPlanExpiresAt(expiry || null);

            if (storeIds.length > 0) {
              // Fetch basic info for all owned stores for the switcher
              const storeList: StoreListItem[] = [];
              const storesData: any[] = [];
              
              for (const id of storeIds) {
                const sSnap = await getDoc(doc(db, "stores", id));
                if (sSnap.exists()) {
                  const sData = sSnap.data();
                  storesData.push({ id: sSnap.id, ...sData });
                }
              }

              // Sort by createdAt to determine primary store
              storesData.sort((a, b) => {
                const tA = a.createdAt?.seconds || 0;
                const tB = b.createdAt?.seconds || 0;
                return tA - tB;
              });

              storesData.forEach((sData, index) => {
                // LOCK RULE: If starter plan and not the oldest store, it is locked.
                const isLocked = activePlan === "starter" && index > 0;
                
                storeList.push({
                  id: sData.id,
                  name: sData.name || "Unnamed Store",
                  plan: sData.plan || "starter",
                  status: sData.status || "live",
                  isLocked,
                });
              });

              setOwnedStores(storeList);

              // Determine which store to load
              const savedId = localStorage.getItem("activeStoreId");
              // If savedId is locked or doesn't exist, fallback to primary store
              const isSavedLocked = storeList.find(s => s.id === savedId)?.isLocked;
              const initialId = (savedId && storeIds.includes(savedId) && !isSavedLocked) ? savedId : storeList[0].id;
              
              setActiveStoreId(initialId);
            } else {
              setOwnedStores([]);
              setLoading(false);
            }
          }
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);

  // 2. Real-time Store Data Listener (Reacts to activeStoreId)
  useEffect(() => {
    if (!activeStoreId) return;

    const storeUnsub = onSnapshot(
      doc(db, "stores", activeStoreId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          setStoreName(data?.name || "Store");
          setStoreType(data?.type || "product");
          setOnboardingStatus(data?.onboardingStatus || "approved");
          setOnboardingNotes(data?.onboardingNotes || null);
          setIsSuspended(!!data?.isSuspended);

          if (userPlan === "starter") {
            setStoreFeatures({
              hasProducts: true,
              hasServices: false,
              hasPreorders: false,
            });
          } else if (data?.features) {
            setStoreFeatures(data.features);
          } else {
            const type = data?.type || "product";
            setStoreFeatures({
              hasProducts: type === "product" || type === "hybrid",
              hasServices: type === "service" || type === "hybrid",
              hasPreorders: type === "hybrid",
            });
          }
          setLoading(false);
        }
      }
    );

    const bookingsQuery = query(
      collection(db, "stores", activeStoreId, "bookings"),
      where("status", "==", "pending")
    );

    const bookingsUnsub = onSnapshot(bookingsQuery, (snapshot) => {
      setPendingBookingsCount(snapshot.docs.length);
    });

    return () => {
      storeUnsub();
      bookingsUnsub();
    };
  }, [activeStoreId]);

  return (
    <AdminStoreContext.Provider
      value={{
        storeId: activeStoreId,
        storeName,
        userPlan,
        planExpiresAt,
        storeType,
        storeFeatures,
        pendingBookingsCount,
        onboardingStatus,
        onboardingNotes,
        isSuspended,
        loading,
        ownedStores,
        switchStore,
        refreshStore,
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
