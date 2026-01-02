import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
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
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface Notification {
  id: string;
  type: "order_update" | "drop" | "info" | "broadcast";
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

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (user?.uid) {
      registerForPushNotificationsAsync().then(async (token) => {
        if (token) {
          await savePushToken(user.uid, token);
        }
      });
    }

    // Explicitly add listeners
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        // Handle foreground notification
        console.log("Foreground Notification Received");
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        console.log("Notification Tapped:", data);
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.uid]); // Only re-run if UID changes (Login/Logout)

  const savePushToken = async (uid: string, token: string) => {
    try {
      await updateDoc(doc(db, "users", uid), {
        expoPushToken: token,
      });
    } catch (e) {
      // If doc doesn't exist, we might need setDoc or handle error.
      // Allowing fail silently for 'users' collection assumption
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

      // Learn more about projectId:
      // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      // For now, getting token without explicit projectId often works if configured in app.json
      // or using development build, but explicitly passing it is safer if using EAS.
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

    // Listen to notifications
    const q = query(
      collection(db, "notifications"),
      where("userId", "in", [user.uid, "all"]),
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
