import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Stack, useRouter, Link, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H1, P } from "@/components/ui/text";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const router = useRouter();
  const { intent } = useLocalSearchParams();
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
      if (intent === "vendor") {
        await AsyncStorage.setItem("appMode", "vendor");
      }

      // Auth
      await signInWithEmailAndPassword(auth, data.email, data.password);

      // Router replacement is handled by root layout listener
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
        <ScrollView contentContainerClassName="flex-grow p-8 justify-center">
          <View className="space-y-8">
            <View>
              <H1>WELCOME BACK.</H1>
              <P className="mt-2 text-center mb-3 text-lg">
                Sign in to access your drops.
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
