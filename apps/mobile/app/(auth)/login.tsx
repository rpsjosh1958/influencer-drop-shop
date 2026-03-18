import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView, Pressable, Linking } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H1, P } from "@/components/ui/text";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ArrowLeft, ExternalLink } from "lucide-react-native";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const router = useRouter();
  const { intent } = useLocalSearchParams();
  const isVendor = intent === "vendor";
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const handleLogin = async () => {
    try {
      setLoading(true);
      setErrors({});

      // Validate
      const data = loginSchema.parse(form);

      // Set App Mode if intent is vendor
      if (isVendor) {
        await AsyncStorage.setItem("appMode", "vendor");
      }

      // Auth
      await signInWithEmailAndPassword(auth, data.email, data.password);

      // Force navigation if intended (safety fallback if listener is unmounted)
      if (isVendor) {
        router.replace("/(vendor)/(tabs)/dashboard");
      } else {
        // Allow root listener or default flow
        // router.replace("/(tabs)");
      }
    } catch (err: any) {
      console.log("Login error:", err);
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        // Use issues or errors, safe cast, and default to empty array to prevent crash
        const issues = (err as any).errors || (err as any).issues || [];
        issues.forEach((e: any) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        // Firebase Errors
        const message = err.message || "Login failed";
        if (
          err.code === "auth/invalid-credential" ||
          err.code === "auth/user-not-found" ||
          err.code === "auth/wrong-password"
        ) {
          alert("Invalid email or password");
        } else {
          alert(message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow p-8">
          <View className="mb-8">
            <Pressable 
              onPress={() => router.back()}
              className="w-10 h-10 bg-zinc-100 rounded-full items-center justify-center active:bg-zinc-200"
            >
              <ArrowLeft size={20} color="black" />
            </Pressable>
          </View>

          <View className="flex-1 justify-center space-y-8">
            <View>
              <H1 className="uppercase text-center tracking-tighter">
                {isVendor ? "ADMIN LOGIN" : "WELCOME BACK."}
              </H1>
              <P className="mt-2 text-zinc-500 text-center mb-3 text-lg">
                {isVendor ? "Login to manage your store." : "Sign in to access your drops."}
              </P>
            </View>

            <View className="space-y-6">
              <Input
                label="Email"
                placeholder="Email"
                value={form.email}
                onChangeText={(t) => setForm((prev) => ({ ...prev, email: t }))}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Password"
                placeholder="Password"
                value={form.password}
                onChangeText={(t) =>
                  setForm((prev) => ({ ...prev, password: t }))
                }
                secureTextEntry
                error={errors.password}
              />
            </View>

            <View className="space-y-4 pt-1 pb-6">
              <Button
                title={loading ? "SIGNING IN..." : "SIGN IN"}
                onPress={handleLogin}
                loading={loading}
              />
            </View>

            {isVendor ? (
              <View className="items-center pt-4">
                <Pressable
                  onPress={() => Linking.openURL("https://copdrop.io/create-store")}
                  className="flex-row items-center gap-2 bg-zinc-50 px-6 py-4 rounded-2xl border border-zinc-100 active:bg-zinc-100"
                >
                  <P className="font-bold text-zinc-600 uppercase tracking-widest text-xs">Create Vendor Profile</P>
                  <ExternalLink size={14} color="#52525b" />
                </Pressable>
                <P className="text-[10px] text-zinc-400 mt-4 text-center px-8 font-medium">
                  Vendor account creation is only available on our web platform.
                </P>
              </View>
            ) : (
              <View className="items-center pt-1">
                <Button
                  title="Don't have an account? Join."
                  variant="ghost"
                  onPress={() => router.push("/(auth)/signup")}
                />

                <Button
                  title="CONTINUE AS GUEST"
                  variant="ghost"
                  size="sm"
                  className="opacity-50"
                  textClassName="text-xs"
                  onPress={() => router.replace("/(tabs)")}
                />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
