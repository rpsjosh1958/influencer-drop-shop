import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { H1, P } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { WallOfDrops } from "@/components/landing/wall-of-drops";
import { Zap, ArrowRight, Store } from "lucide-react-native";
import { useStore } from "@/context/store-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function Onboarding() {
  const router = useRouter();
  const { setStoreId } = useStore();
  const [storeInput, setStoreInput] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleLaunch = async () => {
    if (!storeInput.trim()) {
      Alert.alert("Required", "Please enter a Store ID or URL to enter.");
      return;
    }

    // Basic extraction if they paste a full URL (e.g. copdrop.io/shop/store-name)
    // For now, assume they type the ID/slug directly
    let cleanId = storeInput.trim();
    if (cleanId.includes("/")) {
      const parts = cleanId.split("/");
      cleanId = parts[parts.length - 1]; // Take the last part
    }

    setVerifying(true);
    try {
      const docRef = doc(db, "stores", cleanId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        await setStoreId(cleanId);
        // Mark onboarding as seen
        await AsyncStorage.setItem("hasSeenOnboarding", "true");
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "Store Not Found",
          "Could not find a drop store with that ID."
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to verify store. Check connection.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background Component */}
      <WallOfDrops />

      <SafeAreaView className="flex-1 justify-between p-6">
        {/* Top Header */}
        <View className="flex-row items-center gap-2 self-center bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
          <Zap size={14} color="#fbbf24" fill="#fbbf24" />
          <P className="text-white text-xs font-bold uppercase tracking-widest">
            The Drop Platform
          </P>
        </View>

        {/* Main Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="w-full space-y-8"
        >
          <View className="space-y-2">
            <H1 className="text-white text-6xl font-black text-center tracking-tighter leading-none">
              OWN THE{"\n"}
              <H1 className="text-transparent text-6xl font-black tracking-tighter leading-none text-purple-500">
                HYPE.
              </H1>
            </H1>
            <P className="text-zinc-400 text-center text-lg max-w-xs mx-auto">
              Limited drops. High heat. Zero friction. Enter your store link to
              begin.
            </P>
          </View>

          {/* Input Section */}
          <View className="space-y-4 w-full">
            <View className="bg-white/10 border border-white/20 rounded-2xl p-1 flex-row items-center backdrop-blur-md h-16">
              <View className="pl-4 pr-2">
                <Store size={20} color="#a1a1aa" />
              </View>
              <TextInput
                value={storeInput}
                onChangeText={setStoreInput}
                placeholder="store-name"
                placeholderTextColor="#52525b"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-white text-lg font-bold h-full"
              />
            </View>

            <Button
              title={verifying ? "VERIFYING..." : "ENTER STORE"}
              onPress={handleLaunch}
              disabled={verifying}
              className="h-14 rounded-2xl"
              textClassName="text-lg"
              icon={!verifying && <ArrowRight size={20} color="black" />}
            />

            <P className="text-zinc-600 text-center text-xs">
              OR PASTE A STORE LINK
            </P>
          </View>
        </KeyboardAvoidingView>

        {/* Footer */}
        <P className="text-zinc-600 text-center text-xs py-4">
          © 2025 CopDrop.io
        </P>
      </SafeAreaView>
    </View>
  );
}
