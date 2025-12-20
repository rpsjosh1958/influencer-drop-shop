import { useState, useEffect } from "react";
import { View, Pressable, Dimensions } from "react-native";
import { useNotifications, Notification } from "@/context/notification-context";
import { useRouter } from "expo-router";
import { ShoppingBag, Zap } from "lucide-react-native";
import { P } from "./ui/text";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export function InAppNotificationBanner() {
  const { latestNotification, markAsRead } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [currentNotif, setCurrentNotif] = useState<Notification | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    if (latestNotification && !latestNotification.read) {
      // If we already showed this specific ID, don't show again (local state check)
      // ideally we track "lastShownId".
      if (currentNotif?.id !== latestNotification.id) {
        setCurrentNotif(latestNotification);
        setVisible(true);

        // Auto hide
        const timer = setTimeout(() => {
          setVisible(false);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [latestNotification]);

  if (!visible || !currentNotif) return null;

  const handlePress = () => {
    markAsRead(currentNotif.id);
    setVisible(false);

    if (currentNotif.type === "order_update") {
      // Pass orderId param to highlight/open
      router.push({
        pathname: "/(tabs)/orders",
        params: { orderId: currentNotif.orderId },
      });
    } else {
      router.push("/(tabs)");
    }
  };

  const pan = Gesture.Pan().onUpdate((e) => {
    if (e.translationY < -10) {
      runOnJS(setVisible)(false);
    }
  });

  return (
    <GestureDetector gesture={pan}>
      <MotiView
        from={{ translateY: -100, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: -100, opacity: 0 }}
        transition={{ type: "timing", duration: 400 }}
        style={{
          position: "absolute",
          top: insets.top + 10,
          left: 16,
          right: 16,
          zIndex: 100,
        }}
      >
        <Pressable
          onPress={handlePress}
          className="bg-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-800 flex-row gap-3 items-center"
        >
          <View className="h-10 w-10 rounded-full bg-zinc-800 items-center justify-center border border-zinc-700">
            {currentNotif.type === "drop" ? (
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
          <View className="h-1 w-8 bg-zinc-700 rounded-full absolute bottom-1 right-[40%] opacity-50" />
        </Pressable>
      </MotiView>
    </GestureDetector>
  );
}
