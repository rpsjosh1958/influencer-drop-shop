import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: false, // Don't show OS banner in foreground
    shouldShowList: false,   // Don't show in notification list if in foreground
  }),
});

export interface Notification {
  id: string;
// ... (rest of the interface)
  type:
    | "order_update"
    | "drop"
    | "info"
    | "broadcast"
    | "booking_confirmed"
    | "booking_cancelled_admin";
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
  refetch: () => Promise<any>;
  mode: "customer" | "vendor";
  setMode: (mode: "customer" | "vendor") => void;
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

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const [mode, setMode] = useState<"customer" | "vendor">("customer");

  useEffect(() => {
    // 1. Register Token (If not already done)
    if (user?.uid) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          await savePushToken(user.uid, token);
        }
      });
    }

    // 2. Set Up Listeners (One time setup on mount/unmount)
    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
        // Handle foreground notification
        console.log("Foreground Notification Received:", notification.request.content.title);
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification Tapped:", data);

        if (data?.screen) {
          router.push(data.screen as any);
        } else if (data?.type === "vendor_order") {
          router.push("/(vendor)/orders" as any);
        } else if (data?.type === "vendor_booking") {
          router.push("/(vendor)/bookings" as any);
        } else if (data?.type === "vendor_complaint") {
          router.push("/(vendor)/(tabs)" as any);
        }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [user?.uid]);

  const savePushToken = async (uid: string, token: string) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        expoPushToken: token,
      });
    } catch (e) {
      console.log("Error saving push token:", e);
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Failed to get push token for push notification!");
        return;
      }

      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ??
          Constants?.easConfig?.projectId;
        if (!projectId) {
          console.log(
            "No Project ID found. Skipping Push Token generation. Run 'eas init' to configure."
          );
          return;
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("Expo Push Token:", token);
      } catch (e) {
        console.log("Error fetching token:", e);
      }
    } else {
      console.log("Must use physical device for Push Notifications");
    }

    return token;
  }
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

    // Filter types based on mode
    // Customer: order_update, broadcast, booking_confirmed, booking_cancelled_admin
    // Vendor: store_order_received, store_booking_received, payout_success
    const vendorTypes = [
      "store_order_received",
      "store_booking_received",
      "payout_success",
      "vendor_order",
      "vendor_booking",
      "vendor_complaint",
    ];

    let q = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    // Ideally we would filter by 'type' in Firestore, but 'in' (user.uid, 'all') takes up the logical OR slot
    // and Firestore has limitations. We can filter client-side or use a composite index if needed.
    // Given the volume per user is low, client-side filtering after fetching is acceptable for MVP,
    // OR we rely on separate queries.
    // For now, let's fetch all for the user and filter in the callback to keep it real-time.

    const unsub = onSnapshot(q, async (snapshot) => {
      const items: Notification[] = [];

      const readBroadcasts = JSON.parse(
        (await AsyncStorage.getItem("read_broadcasts")) || "[]"
      );

      snapshot.forEach((doc) => {
        const data = doc.data();
        let isRead = data.read;

        if (
          (data.type === "broadcast" || data.userId === "all") &&
          readBroadcasts.includes(doc.id)
        ) {
          isRead = true;
        }

        // Mode Filtering Logic
        const isVendorType = vendorTypes.includes(data.type);

        if (mode === "vendor" && isVendorType) {
          items.push({ id: doc.id, ...data, read: isRead } as Notification);
        } else if (mode === "customer" && !isVendorType) {
          items.push({ id: doc.id, ...data, read: isRead } as Notification);
        }
      });

      setNotifications(items);

      if (items.length > 0 && !items[0].read) {
        setLatestNotification(items[0]);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [user, mode]);

  const markAsRead = async (id: string) => {
    try {
      const notif = notifications.find((n) => n.id === id);
      const isBroadcast =
        notif &&
        (notif.type === "broadcast" || (notif as any).userId === "all");

      if (isBroadcast) {
        // Store locally
        const readIds = JSON.parse(
          (await AsyncStorage.getItem("read_broadcasts")) || "[]"
        );
        if (!readIds.includes(id)) {
          readIds.push(id);
          await AsyncStorage.setItem(
            "read_broadcasts",
            JSON.stringify(readIds)
          );
        }
        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      } else {
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
        (await AsyncStorage.getItem("read_broadcasts")) || "[]"
      );
      const newIds = [...new Set([...readIds, ...broadcastIds])];
      await AsyncStorage.setItem("read_broadcasts", JSON.stringify(newIds));
    }

    // Process server notifications
    notifications.forEach(async (n) => {
      if (!n.read && n.type !== "broadcast" && (n as any).userId !== "all") {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      }
    });

    // Update local state
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const refetch = async () => {
    return new Promise((resolve) => setTimeout(resolve, 500));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        latestNotification,
        refetch,
        mode,
        setMode,
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
