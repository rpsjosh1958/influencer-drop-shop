import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AnimatedSplash } from "@/components/animated-splash";
import { View } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationProvider } from "@/context/notification-context";
import { InAppNotificationBanner } from "@/components/in-app-notification-banner";

export const unstable_settings = {
  anchor: "(tabs)",
};

import { CartProvider } from "@/context/cart-context";

// ... existing imports

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  // 1. Check Auth (Same as before)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const checkNavigation = async () => {
      if (!authInitialized || !splashFinished) return;

      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");

      if (!hasSeenOnboarding) {
        router.replace("/(auth)/onboarding");
        return;
      }

      if (user) {
        // If user is logged in, ensure we are in the main app
        // We use replace to prevent going back to splash/login
        // Note: This might interfere if deep linking, but fine for now
        router.replace("/(tabs)");
      }
    };

    checkNavigation();
  }, [authInitialized, splashFinished, user]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationProvider>
        <CartProvider>
          <InAppNotificationBanner />
          <ThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <View style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen
                  name="(tabs)"
                  options={{ headerShown: false, gestureEnabled: false }}
                />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="+not-found" />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>

              {/* Splash Overlay */}
              {!splashFinished && (
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 50,
                  }}
                >
                  <AnimatedSplash onFinish={() => setSplashFinished(true)} />
                </View>
              )}
            </View>
            <StatusBar style="auto" />
          </ThemeProvider>
        </CartProvider>
      </NotificationProvider>
    </GestureHandlerRootView>
  );
}
