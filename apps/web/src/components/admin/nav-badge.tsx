"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import {
  collection,
  query,
  where,
  onSnapshot,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function AdminNavBadge({
  type,
}: {
  type: "complaints" | "orders" | "bookings";
}) {
  const { storeId, pendingBookingsCount } = useAdminStore();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (type === "bookings") {
      setCount(pendingBookingsCount);
      return;
    }

    if (!storeId) return;

    let q;

    if (type === "complaints") {
      q = query(
        collection(db, "stores", storeId, "complaints"),
        where("status", "==", "unread")
      );
    } else if (type === "orders") {
      // "paid" is effectively "OPEN" for fulfillment
      q = query(
        collection(db, "stores", storeId, "orders"),
        where("status", "in", ["paid", "open"])
      );
    }

    if (!q) return;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [storeId, type, pendingBookingsCount]);

  if (count === 0) return null;

  return (
    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto animate-in zoom-in">
      {count}
    </span>
  );
}

export function SuperAdminNavBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // 1. Vendor Tickets (Open)
    const q1 = query(
      collectionGroup(db, "tickets"),
      where("status", "==", "open")
    );

    // 2. Platform Complaints (Not Resolved)
    const q2 = query(
      collectionGroup(db, "complaints"),
      where("target", "==", "platform"),
      where("status", "==", "open") // Assuming filtering by 'open' status for badge
    );

    let ticketsCount = 0;
    let complaintsCount = 0;

    const unsub1 = onSnapshot(q1, (snap) => {
      ticketsCount = snap.size;
      setCount(ticketsCount + complaintsCount);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      complaintsCount = snap.size;
      setCount(ticketsCount + complaintsCount);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  if (count === 0) return null;

  return (
    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto animate-in zoom-in">
      {count}
    </span>
  );
}

export function PendingVendorsBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const q = query(
      collection(db, "stores"),
      where("onboardingStatus", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  if (count === 0) return null;

  return (
    <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full ml-auto animate-in zoom-in">
      {count}
    </span>
  );
}
