"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  limit,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import type { FirestoreTimestampLike } from "@/types";

export interface Notification {
  id: string;
  type: "order_update" | "booking_update" | "drop" | "info" | "broadcast";
  title: string;
  message: string;
  read: boolean;
  createdAt: FirestoreTimestampLike;
  orderId?: string;
  // Set to "all" on broadcast notifications (sent platform-wide rather than
  // to one user) — only meaningful when type === "broadcast".
  userId?: string;
  data?: {
    orderId?: string;
    bookingId?: string;
    storeId?: string;
    storeName?: string;
    [key: string]: unknown;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  latestNotification: Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Platform-wide broadcasts (userId "all") are one shared doc, so users can't
// mark or delete them. Their read/dismissed state lives on the user's own
// doc instead (users/{uid}.readBroadcastIds / dismissedBroadcastIds), which
// syncs with the mobile app. Everything else, store broadcasts included
// (one doc per customer), is the user's own doc.
const isPlatformBroadcast = (n: Pick<Notification, "userId">) =>
  n.userId === "all";

// Pre-sync, broadcast reads were kept per browser under this key. Uploaded
// once on sign-in, then removed.
const LEGACY_READ_BROADCASTS_KEY = "read_broadcasts";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [broadcastState, setBroadcastState] = useState<{
    read: string[];
    dismissed: string[];
  }>({ read: [], dismissed: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setRawNotifications([]);
        setBroadcastState({ read: [], dismissed: [] });
        setLoading(false);
      }
    });
    return unsubAuth;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRawNotifications(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification)
      );
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Per-user broadcast read/dismissed state.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        const data = snap.data();
        setBroadcastState({
          read: data?.readBroadcastIds ?? [],
          dismissed: data?.dismissedBroadcastIds ?? [],
        });
      },
      (e) => console.error("Failed to load broadcast state", e)
    );
  }, [user]);

  // One-time upload of the old per-browser broadcast reads.
  useEffect(() => {
    if (!user) return;
    let legacy: string[] = [];
    try {
      legacy = JSON.parse(localStorage.getItem(LEGACY_READ_BROADCASTS_KEY) || "[]");
    } catch {
      legacy = [];
    }
    const done = () => {
      try {
        localStorage.removeItem(LEGACY_READ_BROADCASTS_KEY);
      } catch {}
    };
    if (legacy.length === 0) {
      done();
      return;
    }
    setDoc(
      doc(db, "users", user.uid),
      { readBroadcastIds: arrayUnion(...legacy) },
      { merge: true }
    )
      .then(done)
      .catch((e) => console.error("Failed to migrate broadcast reads", e));
  }, [user]);

  const notifications = useMemo(() => {
    const read = new Set(broadcastState.read);
    const dismissed = new Set(broadcastState.dismissed);
    return rawNotifications
      .filter((n) => !(isPlatformBroadcast(n) && dismissed.has(n.id)))
      // readBroadcastIds also covers store broadcasts that were only marked
      // read in-browser before the sync (see LEGACY_READ_BROADCASTS_KEY).
      .map((n) => ({ ...n, read: n.read || read.has(n.id) }));
  }, [rawNotifications, broadcastState]);

  // The newest one, if unread — the toast shows each id once.
  const latestNotification =
    notifications.length > 0 && !notifications[0].read ? notifications[0] : null;

  const saveBroadcastState = (
    uid: string,
    field: "readBroadcastIds" | "dismissedBroadcastIds",
    ids: string[]
  ) =>
    setDoc(doc(db, "users", uid), { [field]: arrayUnion(...ids) }, { merge: true });

  // Firestore's local cache fires the snapshots straight away, so the UI
  // updates without any optimistic state here.
  const markAsRead = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!user || !notif || notif.read) return;
    try {
      if (isPlatformBroadcast(notif)) {
        await saveBroadcastState(user.uid, "readBroadcastIds", [id]);
      } else {
        await updateDoc(doc(db, "notifications", id), { read: true });
      }
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.read);
    if (!user || unread.length === 0) return;
    try {
      const broadcastIds = unread.filter(isPlatformBroadcast).map((n) => n.id);
      if (broadcastIds.length > 0) {
        await saveBroadcastState(user.uid, "readBroadcastIds", broadcastIds);
      }
      const batch = writeBatch(db);
      unread
        .filter((n) => !isPlatformBroadcast(n))
        .forEach((n) => batch.update(doc(db, "notifications", n.id), { read: true }));
      await batch.commit();
    } catch (e) {
      console.error("Failed to mark all read", e);
    }
  };

  const deleteNotification = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!user || !notif) return;
    try {
      if (isPlatformBroadcast(notif)) {
        await saveBroadcastState(user.uid, "dismissedBroadcastIds", [id]);
      } else {
        await deleteDoc(doc(db, "notifications", id));
      }
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  const clearAll = async () => {
    if (!user || notifications.length === 0) return;
    try {
      const broadcastIds = notifications.filter(isPlatformBroadcast).map((n) => n.id);
      if (broadcastIds.length > 0) {
        await saveBroadcastState(user.uid, "dismissedBroadcastIds", broadcastIds);
      }
      // At most 50 listed, well under a batch's 500-write limit.
      const batch = writeBatch(db);
      notifications
        .filter((n) => !isPlatformBroadcast(n))
        .forEach((n) => batch.delete(doc(db, "notifications", n.id)));
      await batch.commit();
    } catch (e) {
      console.error("Failed to clear notifications", e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        latestNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}
