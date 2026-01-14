import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      // We need to wait for Auth to initialize.
      // Since this component mounts inside Stack, we can assume _layout is mounted.
      // But we need to listen to auth state here or rely on _layout processing?
      // Let's listen directly to be safe and fast.

      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const savedMode = await AsyncStorage.getItem("appMode");
          console.log("[Index] User found. Mode:", savedMode);
          if (savedMode === "vendor") {
            router.replace("/(vendor)/(tabs)/dashboard");
          } else {
            router.replace("/(tabs)");
          }
        } else {
          // Not logged in.
          const hasSeenOnboarding = await AsyncStorage.getItem(
            "hasSeenOnboarding"
          );
          if (!hasSeenOnboarding) {
            router.replace("/(auth)/onboarding");
          } else {
            // Default to tabs (which handles guest/auth logic internally or shows login?)
            // Or redirect to /(auth)/login?
            // Existing logic redirected to (tabs) if user logged in, but what if not?
            // Previous _layout logic: if (!user) -> ??
            // It seemed to rely on (tabs) being accessible or redirecting to auth.
            // Let's send to (tabs) for now, as (tabs) layout allows guests?
            router.replace("/(tabs)");
          }
        }
        // setChecking(false); // No need, we replaced.
      });

      return () => unsub();
    };

    checkUser();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ActivityIndicator size="large" color="#000" />
    </View>
  );
}
