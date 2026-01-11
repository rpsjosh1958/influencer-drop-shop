"use client";

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
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";

export interface Notification {
  id: string;
  type: "order_update" | "drop" | "info" | "broadcast";
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  orderId?: string;
  data?: {
    orderId?: string;
    [key: string]: any;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  latestNotification: Notification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [latestNotification, setLatestNotification] =
    useState<Notification | null>(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setNotifications([]);
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
      const items: Notification[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          // New notification logic if needed
        }
      });

      const readBroadcasts = JSON.parse(
        localStorage.getItem("read_broadcasts") || "[]"
      );

      snapshot.forEach((doc) => {
        const data = doc.data();
        let isRead = data.read;

        // Override read status for broadcasts
        if (
          (data.type === "broadcast" || data.userId === "all") &&
          readBroadcasts.includes(doc.id)
        ) {
          isRead = true;
        }

        items.push({ id: doc.id, ...data, read: isRead } as Notification);
      });

      setNotifications(items);

      if (items.length > 0 && !items[0].read) {
        setLatestNotification(items[0]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      // Find the notification to check its type/userId
      const notif = notifications.find((n) => n.id === id);
      const isBroadcast =
        notif &&
        (notif.type === "broadcast" || (notif as any).userId === "all");

      if (isBroadcast) {
        // Store locally
        const readIds = JSON.parse(
          localStorage.getItem("read_broadcasts") || "[]"
        );
        if (!readIds.includes(id)) {
          readIds.push(id);
          localStorage.setItem("read_broadcasts", JSON.stringify(readIds));
        }
        // Update local state immediately
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } else {
        // Normal update
        await updateDoc(doc(db, "notifications", id), { read: true });
      }
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const markAllAsRead = async () => {
    const broadcastIds: string[] = [];

    // Process local broadcasts
    notifications
      .filter(
        (n) =>
          !n.read && (n.type === "broadcast" || (n as any).userId === "all")
      )
      .forEach((n) => broadcastIds.push(n.id));

    if (broadcastIds.length > 0) {
      const readIds = JSON.parse(
        localStorage.getItem("read_broadcasts") || "[]"
      );
      const newIds = [...new Set([...readIds, ...broadcastIds])];
      localStorage.setItem("read_broadcasts", JSON.stringify(newIds));
    }

    // Process server notifications
    notifications.forEach(async (n) => {
      if (!n.read && n.type !== "broadcast" && (n as any).userId !== "all") {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      }
    });

    // Update local state for immediate UI feedback
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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
