import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AnimatedSplash } from "@/components/animated-splash";
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

  useEffect(() => {
    if (authInitialized) {
      setSplashFinished(true);
    }
  }, [authInitialized]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaystackProvider
          publicKey={process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ""}
          currency="GHS"
          defaultChannels={["card", "mobile_money"]}
        >
          <NotificationProvider>
            <AlertProvider>
              <StoreProvider>
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

                        {/* Splash Overlay */}
                        {(!splashFinished || !authInitialized) && (
                          <View
                            style={{
                              ...StyleSheet.absoluteFillObject,
                              zIndex: 99999,
                              backgroundColor: "#ffffff",
                            }}
                          >
                            <AnimatedSplash
                              onFinish={() => {
                                // Only finish if auth is also ready?
                                // Actually AnimatedSplash handles the wait usually.
                                // Let's just set the flag.
                                // If auth isn't ready, the view stays because of !authInitialized check above.
                                setSplashFinished(true);
                              }}
                            />
                          </View>
                        )}
                      </View>
                      <StatusBar style="auto" />
                    </ThemeProvider>
                  </CartProvider>
                </FontLoader>
              </StoreProvider>
            </AlertProvider>
          </NotificationProvider>
        </PaystackProvider>
      </QueryClientProvider>
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
