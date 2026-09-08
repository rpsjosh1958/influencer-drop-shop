import React, { useState, useEffect } from "react";
// @ts-ignore
import { usePaystack } from "react-native-paystack-webview";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useCart } from "@/context/cart-context";
import { useAlert } from "@/context/alert-context";
import { H1, H2, P } from "@/components/ui/text";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import {
  ArrowLeft,
  MapPin,
  User as UserIcon,
  Mail,
  Phone,
  Truck,
  ShieldCheck,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SlideToPay, SlideToPayRef } from "@/components/ui/slide-to-pay";
import { auth, db, functions } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useStore } from "@/context/store-context";
import { formatCurrency } from "@/lib/format";
import { onAuthStateChanged } from "firebase/auth";

import { useMountEffect } from "@/hooks/use-mount-effect";

// ... inside component
export default function CheckoutScreen() {
  const router = useRouter();
  const { storeId, store } = useStore(); // Get storeId and store object
  const { cart, clearCart, total } = useCart();
  const { showAlert } = useAlert();

  const sliderRef = React.useRef<SlideToPayRef>(null);

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [customerNote, setCustomerNote] = useState("");
  const [user, setUser] = useState<any>(null);

  useMountEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u: any) => {
      setUser(u);
      if (u) {
        // 1. Basic Auth Info
        if (u.displayName) setName(u.displayName);
        if (u.email) setEmail(u.email);

        // 2. Fetch Extended Profile (Phone, Addresses)
        try {
          const docRef = doc(db, "users", u.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            if (data.phone) setPhone(data.phone);

            // Prefill address if available
            const addresses = data.addresses || [];
            const defaultAddress =
              addresses.find((a: any) => a.isDefault) || addresses[0];

            if (defaultAddress) {
              if (defaultAddress.city) setCity(defaultAddress.city);
              if (defaultAddress.street) setAddress(defaultAddress.street);
            }
          }
        } catch (error) {
          console.log("Error fetching user profile:", error);
        }
      }
      setInitializing(false);
    });
    return unsub;
  });

  // ... existing code

  // Stock is reserved/released server-side now (initializeOrderPayment /
  // cancelOrderPayment) — this fixes variant-product checkout, which the
  // old client-side transaction could never do correctly: Firestore rules
  // only ever allowed a public write to `stock`, not `variants`, so any
  // variant purchase was silently rejected.
  const pendingReferenceRef = React.useRef<string | null>(null);

  const handleSuccess = async (res: any) => {
    try {
      if (!storeId) throw new Error("No store context");

      // Never trust the popup's onSuccess alone — confirm server-side
      // (verifies against Paystack and only then creates the order) before
      // telling the customer anything succeeded.
      const confirmOrderPayment = httpsCallable(functions, "confirmOrderPayment");
      await confirmOrderPayment({ reference: res.reference });
      pendingReferenceRef.current = null;

      clearCart();
      setLoading(false);

      showAlert({
        title: "Order Placed!",
        message: "Your order has been successfully placed.",
        type: "success",
        confirmLabel: "Continue Shopping",
        singleButton: true,
        onConfirm: () => {
          router.dismissAll();
          router.replace("/(tabs)");
        },
      });
    } catch (error) {
      console.error("Order confirmation error", error);
      showAlert({
        title: "Order Error",
        message:
          "We couldn't confirm your payment. If you were charged, contact support with your reference: " +
          (res?.reference || "unknown"),
        type: "error",
      });
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLoading(false);
    if (pendingReferenceRef.current) {
      const cancelOrderPayment = httpsCallable(functions, "cancelOrderPayment");
      cancelOrderPayment({ reference: pendingReferenceRef.current }).catch(
        (err) => console.error("Failed to release stock on cancel", err),
      );
      pendingReferenceRef.current = null;
    }
    showAlert({
      title: "Payment Cancelled",
      message: "You cancelled the payment process.",
      type: "info",
    });
  };

  // Removed paystackWebViewRef

  const { popup } = usePaystack();

  const handlePayPress = async () => {
    if (!name || !email || !phone || !address || !city) {
      sliderRef.current?.reset();
      showAlert({
        title: "Missing Information",
        message: "Please fill in all shipping details.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const initializeOrderPayment = httpsCallable(
        functions,
        "initializeOrderPayment",
      );
      const { data }: any = await initializeOrderPayment({
        storeId,
        items: cart.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          imageUrl: item.image,
          selectedVariant: item.variant || null,
        })),
        shipping: {
          fullName: name,
          email,
          phone,
          address: `${address}, ${city}`,
          country: "Ghana",
          city,
          street: address,
          zip: "",
        },
        customerNote,
        guestEmail: email,
      });

      // Stock is now reserved server-side — remember the reference so
      // handleCancel can release it if the customer backs out.
      pendingReferenceRef.current = data.reference;

      popup.checkout({
        amount: data.amount / 100, // server returns pesewas; this SDK takes GHS
        email,
        reference: data.reference,
        metadata: {
          name,
          mobile: phone,
        },
        onSuccess: handleSuccess,
        onCancel: handleCancel,
      });
    } catch (error: any) {
      // initializeOrderPayment already releases any reservation it made
      // before throwing (e.g. Paystack init failed) — nothing to release here.
      console.error("Order initialization error", error);
      sliderRef.current?.reset();
      setLoading(false);
      showAlert({
        title: "Checkout Error",
        message:
          error?.message ||
          "Couldn't start checkout for this store. Please try again.",
        type: "error",
      });
    }
  };

  if (initializing) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="black" />
      </View>
    );
  }

  // If empty cart and not processing, redirect back
  if (cart.length === 0 && !loading) {
    // Optional: Redirect if needed, but handled by success modal usually.
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.View
        entering={FadeIn.duration(600).springify()}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1">
          {/* Header */}
          <View className="flex-row items-center px-6 py-4 border-b border-zinc-100">
            <Pressable
              onPress={() => router.back()}
              className="p-2 -ml-2 rounded-full active:bg-zinc-100"
            >
              <ArrowLeft size={24} color="black" />
            </Pressable>
            <H1 className="text-2xl font-black uppercase">CHECKOUT</H1>
            <View className="w-10" />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
            >
              {/* Order Summary */}
              <View className="bg-zinc-50 p-6 rounded-2xl mb-8">
                <H2 className="text-sm font-black text-zinc-400 mb-4 uppercase tracking-widest">
                  Order Summary
                </H2>
                <View className="space-y-4">
                  {cart.map((item) => (
                    <View
                      key={`${item.id}-${item.variant?.id}`}
                      className="flex-row justify-between"
                    >
                      <View className="mb-3 flex-row gap-3 flex-1">
                        <View className="bg-white w-6 h-6 rounded-full items-center justify-center shadow-sm">
                          <P className="font-bold text-xs">{item.quantity}</P>
                        </View>
                        <View>
                          <P className="font-bold" numberOfLines={1}>
                            {truncate(item.name, 20)}
                          </P>
                          {item.variant && (
                            <P className="text-xs text-zinc-500">
                              {item.variant.name}
                            </P>
                          )}
                        </View>
                      </View>
                      <P className="font-bold">
                        {formatCurrency(
                          (item.variant?.price || item.price) * item.quantity
                        )}
                      </P>
                    </View>
                  ))}
                  <View className="h-px bg-zinc-200 my-2" />
                  <View className="flex-row justify-between items-center">
                    <P className="font-bold text-lg">Total</P>
                    <P className="font-black text-xl">{formatCurrency(total)}</P>
                  </View>
                </View>
              </View>

              {/* Shipping Details form */}
              <View className="space-y-6">
                <H2 className="text-sm font-black text-zinc-400 mb-2 uppercase tracking-widest">
                  Shipping Info
                </H2>

                <View className="space-y-4">
                  <View className="mb-3 flex-row items-center bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-14">
                    <UserIcon size={20} color="#a1a1aa" />
                    <TextInput
                      placeholder="Full Name"
                      value={name}
                      onChangeText={setName}
                      className="flex-1 ml-3 font-medium text-base text-black"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>

                  <View className="mb-3 flex-row items-center bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-14">
                    <Mail size={20} color="#a1a1aa" />
                    <TextInput
                      placeholder="Email Address"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="flex-1 ml-3 font-medium text-base text-black"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>

                  <View className="mb-3 flex-row items-center bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-14">
                    <Phone size={20} color="#a1a1aa" />
                    <TextInput
                      placeholder="Phone Number"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      className="flex-1 ml-3 font-medium text-base text-black"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>

                  <View className="mb-3 flex-row items-center bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-14">
                    <MapPin size={20} color="#a1a1aa" />
                    <TextInput
                      placeholder="City"
                      value={city}
                      onChangeText={setCity}
                      className="flex-1 ml-3 font-medium text-base text-black"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>

                  <View className="flex-row items-center bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-14">
                    <TextInput
                      placeholder="Street Address / Directions"
                      value={address}
                      onChangeText={setAddress}
                      className="flex-1 ml-3 font-medium text-base text-black"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                </View>

                {/* Customer Note */}
                <View className="mt-6">
                  <H2 className="text-sm font-black text-zinc-400 mb-2 uppercase tracking-widest">
                    Order Note (Optional)
                  </H2>
                  <View className="bg-zinc-50 border border-zinc-100 rounded-2xl px-4 py-3">
                    <TextInput
                      placeholder="Any special instructions for delivery..."
                      value={customerNote}
                      onChangeText={setCustomerNote}
                      multiline
                      numberOfLines={3}
                      className="font-medium text-base text-black h-24"
                      placeholderTextColor="#a1a1aa"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </View>

              {/* Info */}
              <View className="bg-blue-50 p-4 rounded-xl flex-row gap-3 mt-8">
                <ShieldCheck size={20} color="#2563eb" />
                <P className="text-blue-800 text-xs flex-1 leading-5">
                  Payments are secured by Paystack. We do not store your card
                  details. Delivery is usually within 2-3 business days.
                </P>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Footer */}
          <View className="px-6 py-6 border-t border-zinc-100 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
            <SlideToPay
              ref={sliderRef}
              amount={total}
              onSuccess={handlePayPress}
              isLoading={loading}
            />
          </View>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const truncate = (str: string, n: number) => {
  return str.length > n ? str.slice(0, n - 1) + "..." : str;
};
