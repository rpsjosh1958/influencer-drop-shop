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

      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Notification);
      });

      setNotifications(items);

      if (items.length > 0 && !items[0].read) {
        // Simple logic: if the newest item is unread, set it as latest for toast
        setLatestNotification(items[0]);
      } else {
        // If read, we might still want it if it *was* just added?
        // For now, rely on unread status for "New" alerts.
      }

      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true });
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  };

  const markAllAsRead = async () => {
    notifications.forEach(async (n) => {
      if (!n.read) {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      }
    });
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
