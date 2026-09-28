import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useRef,
} from "react";
import { router, type Href } from "expo-router";
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
  deleteDoc,
  setDoc,
  limit,
  arrayUnion,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getNotificationRoute } from "@/lib/notification-routing";
import { whenSplashDone } from "@/lib/splash-gate";
import { useStore } from "@/context/store-context";
import type { FirestoreTimestamp } from "@/types";

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
  type:
    | "order_update"
    | "drop"
    | "info"
    | "broadcast"
    | "booking_confirmed"
    | "booking_cancelled_admin"
    | "booking_cancelled"
    | "booking_update"
    | "store_order_received"
    | "store_booking_received"
    | "payout_success"
    | "vendor_order"
    | "vendor_booking"
    | "vendor_refund"
    | "vendor_complaint";
  title: string;
  message: string;
  read: boolean;
  createdAt: FirestoreTimestamp;
  orderId?: string; // Optional reference
  userId?: string; // "all" for broadcasts
  data?: {
    id?: string;
    storeId?: string;
    storeName?: string;
    screen?: string;
    orderId?: string;
    bookingId?: string;
    date?: string;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  // Deletes every notification currently listed (for the current mode).
  clearAll: () => Promise<void>;
  latestNotification: Notification | null; // For Banner
  refetch: () => Promise<void>;
  mode: "customer" | "vendor";
  setMode: (mode: "customer" | "vendor") => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// Platform-wide broadcasts (userId "all") are one shared doc, so users can't
// mark or delete them. Their read/dismissed state lives on the user's own
// doc instead (users/{uid}.readBroadcastIds / dismissedBroadcastIds), which
// syncs across devices and the web. Everything else, store broadcasts
// included (one doc per customer), is the user's own doc.
const isPlatformBroadcast = (n: Pick<Notification, "userId">) =>
  n.userId === "all";

// Pre-sync, broadcast reads were kept per device under this key. Uploaded
// once on sign-in, then removed.
const LEGACY_READ_BROADCASTS_KEY = "read_broadcasts";

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { setStoreId } = useStore();
  const [user, setUser] = useState<User | null>(null);
  // As fetched (already filtered to the current mode); read/dismissed
  // broadcast state is applied on top below.
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [broadcastState, setBroadcastState] = useState<{
    read: string[];
    dismissed: string[];
  }>({ read: [], dismissed: [] });
  const [loading, setLoading] = useState(true);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(
    null
  );

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
        const data = response.notification.request.content.data as
          | (Notification["data"] & { type?: string })
          | undefined;
        console.log("Notification Tapped:", data);

        // Order/booking types route via type+id first — the stored `screen`
        // value isn't always mobile-safe (some backend events set a web
        // admin path like "/admin/orders") or may be missing the id.
        const route = getNotificationRoute({
          type: (data?.type || "") as Notification["type"],
          data,
        });
        if (route) {
          router.push(route);
        } else if (data?.type === "vendor_complaint") {
          router.push("/(vendor)/(tabs)" as Href);
        } else if (data?.type === "broadcast" && data?.storeId) {
          // No dedicated route — broadcasts switch the active store and
          // land on the shop home, mirroring the "view store" pattern in
          // global-search.tsx.
          setStoreId(data.storeId).then(() => router.dismissTo("/"));
        } else if (data?.screen) {
          router.push(data.screen as Href);
        }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [user?.uid]);

  const savePushToken = async (uid: string, token: string) => {
    try {
      // setDoc(..., { merge: true }) instead of updateDoc — updateDoc
      // throws NOT_FOUND if users/{uid} doesn't exist yet (e.g. an account
      // that never went through normal signup, like a super-admin login),
      // which silently failed here with no user-facing error, so the
      // token could never be saved and every push to that account looked
      // like "no token" forever, not just a one-time miss.
      await setDoc(doc(db, "users", uid), { expoPushToken: token }, { merge: true });
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
        // The system prompt would otherwise pop up over the splash.
        await whenSplashDone();
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
        setRawNotifications([]);
        setBroadcastState({ read: [], dismissed: [] });
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
      "booking_cancelled", // customer cancelled — this is vendor-facing
      "vendor_refund", // refund/dispute updates — also vendor-facing
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

    const unsub = onSnapshot(q, (snapshot) => {
      const items: Notification[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // Mode Filtering Logic
        const isVendorType = vendorTypes.includes(data.type);

        if (mode === "vendor" && isVendorType) {
          items.push({ id: doc.id, ...data } as Notification);
        } else if (mode === "customer" && !isVendorType) {
          items.push({ id: doc.id, ...data } as Notification);
        }
      });

      setRawNotifications(items);
      setLoading(false);
    });

    return () => unsub();
  }, [user, mode]);

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
      (e) => console.log("Failed to load broadcast state", e)
    );
  }, [user]);

  // One-time upload of the old per-device broadcast reads.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const legacy: string[] = JSON.parse(
        (await AsyncStorage.getItem(LEGACY_READ_BROADCASTS_KEY)) || "[]"
      );
      if (legacy.length > 0) {
        await setDoc(
          doc(db, "users", user.uid),
          { readBroadcastIds: arrayUnion(...legacy) },
          { merge: true }
        );
      }
      await AsyncStorage.removeItem(LEGACY_READ_BROADCASTS_KEY);
    })().catch((e) => console.log("Failed to migrate broadcast reads", e));
  }, [user]);

  const notifications = useMemo(() => {
    const read = new Set(broadcastState.read);
    const dismissed = new Set(broadcastState.dismissed);
    return rawNotifications
      .filter((n) => !(isPlatformBroadcast(n) && dismissed.has(n.id)))
      // readBroadcastIds also covers store broadcasts that were only marked
      // read on-device before the sync (see LEGACY_READ_BROADCASTS_KEY).
      .map((n) => ({ ...n, read: n.read || read.has(n.id) }));
  }, [rawNotifications, broadcastState]);

  // The newest one, if unread — the in-app banner shows each id once.
  const latestNotification =
    notifications.length > 0 && !notifications[0].read ? notifications[0] : null;

  const saveBroadcastState = (field: "readBroadcastIds" | "dismissedBroadcastIds", ids: string[]) =>
    setDoc(
      doc(db, "users", user!.uid),
      { [field]: arrayUnion(...ids) },
      { merge: true }
    );

  // Firestore's local cache fires the snapshots straight away, so the UI
  // updates without any optimistic state here.
  const markAsRead = async (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    if (!user || !notif || notif.read) return;
    try {
      if (isPlatformBroadcast(notif)) {
        await saveBroadcastState("readBroadcastIds", [id]);
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
        await saveBroadcastState("readBroadcastIds", broadcastIds);
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
        await saveBroadcastState("dismissedBroadcastIds", [id]);
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
        await saveBroadcastState("dismissedBroadcastIds", broadcastIds);
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

  const refetch = async () => {
    return new Promise<void>((resolve) => setTimeout(resolve, 500));
  };

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
