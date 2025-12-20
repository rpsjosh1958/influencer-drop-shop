import { useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { H1, P } from "@/components/ui/text";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const COUNTRIES = ["Ghana", "Nigeria", "United States", "United Kingdom"];
const CITIES: Record<string, string[]> = {
  Ghana: ["Accra", "Kumasi", "Tamale", "Takoradi"],
  Nigeria: ["Lagos", "Abuja", "Port Harcourt"],
  "United States": ["New York", "Los Angeles", "Chicago"],
  "United Kingdom": ["London", "Manchester", "Birmingham"],
};

const signupSchema = z.object({
  fullName: z.string().min(2, "Name is too short"),
  phone: z.string().min(10, "Phone number is too short"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  country: z.string(),
  city: z.string(),
  street: z.string().min(5, "Street address is too short"),
  zip: z.string().optional(),
});

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    country: "Ghana",
    city: "Accra",
    street: "",
    zip: "",
  });

  const handleSignup = async () => {
    try {
      setLoading(true);
      setErrors({});

      const data = signupSchema.parse(form);

      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        data.email,
        data.password
      );
      const user = userCredential.user;

      // 2. Update Profile
      await updateProfile(user, { displayName: data.fullName });

      // 3. Create User Document
      const initialAddress = {
        id: Date.now().toString(),
        country: data.country,
        city: data.city,
        street: data.street,
        zip: data.zip || "",
        isDefault: true,
      };

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: data.fullName,
        phone: data.phone,
        role: "customer",
        addresses: [initialAddress],
        createdAt: serverTimestamp(),
      });

      console.log("Signup success:", user.uid);
      // Router replacement is handled by root layout listener usually, but forcing here works too
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        // Cast to any to bypass strict checks, valid at runtime
        (err as any).errors.forEach((e: any) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        alert(err.message || "Signup failed");
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
          <View className="space-y-8 pb-10">
            <View>
              <H1 className="text-center">JOIN THE DROP.</H1>
              <P className="text-center text-lg mb-5">Create an account to secure your bag.</P>
            </View>

            {/* Identity */}
            <View className="space-y-6">
              <P className="text-xs mb-2 font-bold uppercase text-zinc-400">
                Identity
              </P>
              <Input
                placeholder="Full Name"
                value={form.fullName}
                onChangeText={(t) =>
                  setForm((prev) => ({ ...prev, fullName: t }))
                }
                error={errors.fullName}
              />
              <Input
                placeholder="Phone"
                keyboardType="decimal-pad"
                value={form.phone}
                onChangeText={(t) => setForm((prev) => ({ ...prev, phone: t }))}
                error={errors.phone}
              />
              <Input
                placeholder="Email"
                value={form.email}
                onChangeText={(t) => setForm((prev) => ({ ...prev, email: t }))}
                autoCapitalize="none"
                keyboardType="email-address"
                error={errors.email}
              />
              <Input
                placeholder="Password"
                value={form.password}
                onChangeText={(t) =>
                  setForm((prev) => ({ ...prev, password: t }))
                }
                secureTextEntry
                error={errors.password}
              />
            </View>

            {/* Shipping */}
            <View className="space-y-6 pt-4 border-t border-zinc-100">
              <P className="text-xs mb-2 font-bold uppercase text-zinc-400">
                Shipping Address
              </P>

              <Input
                placeholder="Country (Tap to cycle)"
                value={form.country}
                editable={false}
                onPressIn={() => {
                  const idx = COUNTRIES.indexOf(form.country);
                  const next = COUNTRIES[(idx + 1) % COUNTRIES.length];
                  setForm((p) => ({
                    ...p,
                    country: next,
                    city: CITIES[next][0],
                  }));
                }}
              />

              <Input
                placeholder="City (Tap to cycle)"
                value={form.city}
                editable={false}
                onPressIn={() => {
                  const currentCities = CITIES[form.country];
                  const idx = currentCities.indexOf(form.city);
                  const next = currentCities[(idx + 1) % currentCities.length];
                  setForm((p) => ({ ...p, city: next }));
                }}
              />

              <Input
                placeholder="Street Address"
                value={form.street}
                onChangeText={(t) =>
                  setForm((prev) => ({ ...prev, street: t }))
                }
                error={errors.street}
              />
              <Input
                placeholder="Zip / Digital Address (Optional)"
                value={form.zip}
                onChangeText={(t) => setForm((prev) => ({ ...prev, zip: t }))}
                error={errors.zip}
              />
            </View>

            <View className="space-y-4 pt-4">
              <Button
                title={loading ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
                onPress={handleSignup}
                loading={loading}
              />

              <Button
                title="Already have an account? Sign In."
                variant="ghost"
                onPress={() => router.back()}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
