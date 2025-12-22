import { useMemo, useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
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

import { Country, City } from "country-state-city";
import { SelectionModal } from "@/components/ui/selection-modal";
import { ChevronRight } from "lucide-react-native";
import clsx from "clsx";

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
    country: "GH",
    city: "",
    street: "",
    zip: "",
  });

  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Data Memos
  const countryOptions = useMemo(
    () =>
      Country.getAllCountries().map((c) => ({
        label: c.name,
        value: c.isoCode,
      })),
    []
  );

  const cityOptions = useMemo(() => {
    if (!form.country) return [];
    return (
      City.getCitiesOfCountry(form.country)?.map((c) => ({
        label: c.stateCode ? `${c.name} (${c.stateCode})` : c.name,
        value: c.name,
      })) || []
    );
  }, [form.country]);

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
              <P className="text-center text-lg mb-5">
                Create an account to secure your bag.
              </P>
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

              {/* Country Selection */}
              <View>
                <P className="text-xs mb-2 font-bold uppercase text-zinc-400">
                  Country
                </P>
                <TouchableOpacity
                  onPress={() => setCountryModalVisible(true)}
                  className="bg-zinc-50 mb-5 p-4 rounded-xl border border-zinc-200 flex-row items-center justify-between"
                  style={{ height: 56 }}
                >
                  <Text
                    className={clsx(
                      "font-bold text-base",
                      form.country ? "text-black" : "text-zinc-400"
                    )}
                  >
                    {countryOptions.find((c) => c.value === form.country)
                      ?.label || "Select Country"}
                  </Text>
                  <ChevronRight size={20} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              {/* City Selection */}
              <View>
                <P className="text-xs mb-2 font-bold uppercase text-zinc-400">
                  City
                </P>
                <TouchableOpacity
                  onPress={() => {
                    if (!form.country) return;
                    setCityModalVisible(true);
                  }}
                  className={clsx(
                    "mb-5 bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex-row items-center justify-between",
                    !form.country && "opacity-50"
                  )}
                  style={{ height: 56 }}
                >
                  <Text
                    className={clsx(
                      "font-bold text-base",
                      form.city ? "text-black" : "text-zinc-400"
                    )}
                  >
                    {form.city || "Select City"}
                  </Text>
                  <ChevronRight size={20} color="#a1a1aa" />
                </TouchableOpacity>
              </View>

              {/* Modals */}
              <SelectionModal
                visible={countryModalVisible}
                onClose={() => setCountryModalVisible(false)}
                title="Select Country"
                options={countryOptions}
                onSelect={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    country: val,
                    city: "", // Reset city
                  }))
                }
                selectedValue={form.country}
              />
              <SelectionModal
                visible={cityModalVisible}
                onClose={() => setCityModalVisible(false)}
                title="Select City"
                options={cityOptions}
                onSelect={(val) => setForm((prev) => ({ ...prev, city: val }))}
                selectedValue={form.city}
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
