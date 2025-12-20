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
import { onAuthStateChanged } from "firebase/auth";

export interface Notification {
  id: string;
  type: "order_update" | "drop" | "info";
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
  orderId?: string; // Optional reference
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  latestNotification: Notification | null; // For Banner
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
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

    // Listen to notifications
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Notification[] = [];
      let isFirstLoad = loading; // simplistic check

      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          // If this is a new notification added *after* initial load (or very top of list), potentially trigger banner
          // real-time check: if the timestamp is very recent?
          // simpler: just set latestNotification if it's "modified" or "added" at index 0
        }
      });

      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Notification);
      });

      setNotifications(items);

      // Check for a fresh unread notification to show generic banner
      // We only want to show banner for the very top item if it's unread and we haven't seen it in this session logic?
      // actually, let's just expose the top unread item if it was just added.
      // For now, simpliest approach: Just expose the first item if unread.
      if (items.length > 0 && !items[0].read) {
        // Verify it's recent (e.g. within last 10 seconds)?
        // Or just let the UI handle "Previous vs New" logic.
        // The banner component will decide whether to show based on ID change.
        setLatestNotification(items[0]);
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
    // Batch update ideally, or just loop for now (client side limited usually)
    // For simplicity, verify functionality first.
    // In production, use a batch write.
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
