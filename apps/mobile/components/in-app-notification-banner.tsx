import { useState, useEffect } from "react";
import { View, Pressable, Dimensions } from "react-native";
import { useNotifications, Notification } from "@/context/notification-context";
import { useRouter, type Href } from "expo-router";
import { getNotificationRoute } from "@/lib/notification-routing";
import { ShoppingBag, Zap } from "lucide-react-native";
import { P } from "./ui/text";
import { MotiView, AnimatePresence } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

const AUTO_HIDE_MS = 5000;

export function InAppNotificationBanner() {
  const { latestNotification, markAsRead, mode } = useNotifications();
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // latestNotification is already "newest, if unread"; the banner shows it
  // until it's hidden by id.
  const currentNotif: Notification | null =
    latestNotification && latestNotification.id !== hiddenId
      ? latestNotification
      : null;
  const currentId = currentNotif?.id;

  // Keyed on the id, not the object: the context rebuilds notification
  // objects on every snapshot (any users/{uid} change does it), which used
  // to re-run this, cancel the hide timer and never re-arm it — so the
  // banner never left.
  useEffect(() => {
    if (!currentId) return;
    const timer = setTimeout(() => setHiddenId(currentId), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [currentId]);

  const hide = () => currentId && setHiddenId(currentId);

  const handlePress = () => {
    if (!currentNotif) return;
    markAsRead(currentNotif.id);
    hide();

    const route = getNotificationRoute(currentNotif);
    if (route) {
      router.push(route);
    } else if (currentNotif.type === "vendor_complaint") {
      // No dedicated complaints screen — the Alerts tab is where the
      // complaint modal actually opens, so land there rather than a route
      // that doesn't exist.
      router.push(
        (mode === "vendor"
          ? "/(vendor)/(tabs)/notifications"
          : "/(tabs)") as Href,
      );
    } else {
      router.push((mode === "vendor" ? "/(vendor)/(tabs)" : "/(tabs)") as Href);
    }
  };

  const pan = Gesture.Pan().onUpdate((e) => {
    if (e.translationY < -10) {
      runOnJS(hide)();
    }
  });

  // AnimatePresence is what makes `exit` actually play (slide up and out);
  // without it the banner just vanished when unmounted.
  return (
    <AnimatePresence>
      {currentNotif && (
        <MotiView
          key={currentNotif.id}
          from={{ translateY: -100, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: -200, opacity: 0 }}
          transition={{ type: "timing", duration: 400 }}
          style={{
            position: "absolute",
            top: insets.top + 10,
            left: 16,
            right: 16,
            zIndex: 100,
          }}
        >
          <GestureDetector gesture={pan}>
            <Pressable
              onPress={handlePress}
              className="bg-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-800 flex-row gap-3 items-center"
            >
              <View className="h-10 w-10 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700">
                {currentNotif.type === "drop" ||
                currentNotif.type === "broadcast" ? (
                  <Zap size={18} color="#fbbf24" fill="#fbbf24" />
                ) : (
                  <ShoppingBag size={18} color="white" />
                )}
              </View>
              <View className="flex-1">
                <P className="text-white font-bold text-sm mb-0.5">
                  {currentNotif.title}
                </P>
                <P className="text-zinc-400 text-xs" numberOfLines={1}>
                  {currentNotif.message}
                </P>
              </View>
            </Pressable>
          </GestureDetector>
        </MotiView>
      )}
    </AnimatePresence>
  );
}
