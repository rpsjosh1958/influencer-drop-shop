import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // Small delay to ensure Root Layout is mounted before navigation
      // This prevents the "Attempted to navigate before mounting the Root Layout" error
      setTimeout(async () => {
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
            // Default to tabs (which handles guest/auth logic internally)
            router.replace("/(tabs)");
          }
        }
      }, 100);
    });

    return () => unsub();
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
