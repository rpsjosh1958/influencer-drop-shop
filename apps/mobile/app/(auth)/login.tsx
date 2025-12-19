import { useState } from "react";
import { View, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Stack, useRouter, Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H1, P } from "@/components/ui/text";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase"; // Need to ensure firebase is setup in mobile

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const router = useRouter();
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

      // Auth
      // Note: Firebase JS SDK works in Expo but requires proper config.
      await signInWithEmailAndPassword(auth, data.email, data.password);

      // Router replacement is handled by root layout listener, but we can do it here too for safety/speed
      // router.replace("/(tabs)");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        // Cast to any to bypass strict checks, valid at runtime
        (err as any).errors.forEach((e: any) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        alert(err.message || "Login failed");
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
              <P className="mt-2 text-lg">Sign in to access your drops.</P>
            </View>

            <View className="space-y-4">
              <Input
                label="Email"
                placeholder="Ex. hypebeast@drop.com"
                value={form.email}
                onChangeText={(t) => setForm((prev) => ({ ...prev, email: t }))}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                label="Password"
                placeholder="••••••••"
                value={form.password}
                onChangeText={(t) =>
                  setForm((prev) => ({ ...prev, password: t }))
                }
                secureTextEntry
                error={errors.password}
              />
            </View>

            <View className="space-y-4 pt-4">
              <Button
                title={loading ? "SIGNING IN..." : "SIGN IN"}
                onPress={handleLogin}
                loading={loading}
              />

              <Button
                title="Don't have an account? Join."
                variant="ghost"
                onPress={() => router.push("/(auth)/signup")}
              />
            </View>

            <View className="items-center pt-8">
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
