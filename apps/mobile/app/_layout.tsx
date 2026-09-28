import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "expo-router/react-navigation";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AnimatedSplash } from "@/components/animated-splash";
import { markSplashDone } from "@/lib/splash-gate";
import { View, useColorScheme } from "react-native";
import { PaystackProvider } from "react-native-paystack-webview";
import { NotificationProvider } from "@/context/notification-context";
import { InAppNotificationBanner } from "@/components/in-app-notification-banner";
import { FontLoader } from "@/components/font-loader";

import { CartProvider } from "@/context/cart-context";
import { AlertProvider } from "@/context/alert-context";
import { StoreProvider } from "@/context/store-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [authInitialized, setAuthInitialized] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  // 1. Check Auth (Global Listener)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // User filtering now handled in index.tsx
      setAuthInitialized(true);
    });
    return () => unsub();
  }, []);

  // The splash used to be dismissed here as soon as auth resolved, which
  // cut its animation off at a different point every launch (however long
  // auth took). AnimatedSplash now decides: it plays in full and only
  // leaves once auth is also ready (`ready` below).
  const finishSplash = useCallback(() => {
    setSplashFinished(true);
    markSplashDone();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaystackProvider
          publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ""}
          currency="GHS"
          defaultChannels={["card", "mobile_money"]}
        >
          <StoreProvider>
            <NotificationProvider>
              <AlertProvider>
                <FontLoader>
                  <CartProvider>
                    <InAppNotificationBanner />
                    <ThemeProvider
                      value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                    >
                      <View style={{ flex: 1 }}>
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="index" />
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="(auth)" />
                          <Stack.Screen name="+not-found" />
                          <Stack.Screen
                            name="modal"
                            options={{ presentation: "modal", title: "Modal" }}
                          />
                          <Stack.Screen name="checkout" />
                          <Stack.Screen
                            name="(vendor)"
                            options={{
                              gestureEnabled: false,
                              headerShown: false,
                            }}
                          />
                        </Stack>

                      </View>
                      <StatusBar style="auto" />
                    </ThemeProvider>
                  </CartProvider>
                </FontLoader>
              </AlertProvider>
            </NotificationProvider>
          </StoreProvider>
        </PaystackProvider>
      </QueryClientProvider>

      {/* Splash Overlay — last child of the root, so it's drawn over
          everything, including the in-app notification banner (zIndex 100
          at the provider level, which used to show on top of it). */}
      {!splashFinished && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            zIndex: 99999,
            elevation: 99999,
            backgroundColor: "#ffffff",
          }}
        >
          <AnimatedSplash ready={authInitialized} onFinish={finishSplash} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const StyleSheet = {
  absoluteFillObject: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  } as const,
};
