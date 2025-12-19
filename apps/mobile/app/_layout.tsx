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

  // 2. Navigation Logic (Same as before)
  useEffect(() => {
    if (authInitialized && splashFinished) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/onboarding");
      }
    }
  }, [authInitialized, splashFinished, user]);

  return (
    <CartProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <View style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
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
  );
}
