import React, { useState, useEffect, useRef } from "react";
// @ts-ignore
import { Paystack } from "react-native-paystack-webview";
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

import { SlideToPay } from "@/components/ui/slide-to-pay";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import { useStore } from "@/context/store-context";

// ... inside component
export default function CheckoutScreen() {
  const router = useRouter();
  const { storeId } = useStore(); // Get storeId
  const { cart, clearCart, total } = useCart();
  const { showAlert } = useAlert();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Pre-fill if available
        if (u.displayName) setName(u.displayName);
        if (u.email) setEmail(u.email);
      }
      setInitializing(false);
    });
    return unsub;
  }, []);

  // ... existing code

  const reserveStock = async () => {
    if (!storeId) return false;
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read all product docs first
        const productReads = await Promise.all(
          cart.map(async (item) => {
            const ref = doc(db, "stores", storeId, "products", item.id); // Updated path
            const snapshot = await transaction.get(ref);
            return { ref, snapshot, item };
          })
        );

        // ... validation logic (same as before)
        for (const { snapshot, item } of productReads) {
          if (!snapshot.exists()) {
            throw new Error(`Product ${item.name} no longer exists.`);
          }
          // ... rest of validation
          const productData = snapshot.data();

          if (item.variant) {
            const variants = productData.variants || [];
            const variant = variants.find(
              (v: any) => v.id === item.variant!.id
            );
            if (!variant)
              throw new Error(
                `Variant ${item.variant.name} of ${item.name} no longer exists.`
              );
            if (variant.stock < item.quantity)
              throw new Error(
                `Not enough stock for ${item.name} (${item.variant.name}). Only ${variant.stock} left.`
              );
          } else {
            const currentStock = productData.stock ?? 0;
            if (currentStock < item.quantity)
              throw new Error(
                `Not enough stock for ${item.name}. Only ${currentStock} left.`
              );
          }
        }

        // 3. Write updates (deduct stock)
        for (const { ref, snapshot, item } of productReads) {
          const productData = snapshot.data();
          if (!productData) continue;

          if (item.variant) {
            const variants = productData.variants || [];
            const updatedVariants = variants.map((v: any) => {
              if (v.id === item.variant!.id) {
                return { ...v, stock: v.stock - item.quantity };
              }
              return v;
            });
            const newTotalStock = (productData.stock ?? 0) - item.quantity;
            transaction.update(ref, {
              variants: updatedVariants,
              stock: newTotalStock,
            });
          } else {
            const newStock = (productData.stock ?? 0) - item.quantity;
            transaction.update(ref, { stock: newStock });
          }
        }
      });
      return true;
    } catch (err: any) {
      console.error("Stock reservation failed:", err);
      showAlert({
        title: "Stock Error",
        message: err.message || "Failed to reserve stock. Please try again.",
        type: "error",
      });
      return false;
    }
  };

  const restoreStock = async () => {
    if (!storeId) return;
    try {
      await runTransaction(db, async (transaction) => {
        const reads = await Promise.all(
          cart.map((item) =>
            transaction.get(doc(db, "stores", storeId, "products", item.id))
          )
        );

        reads.forEach((snap, idx) => {
          if (!snap.exists()) return;
          const item = cart[idx];
          const data = snap.data();
          if (!data) return;

          const ref = doc(db, "stores", storeId, "products", item.id);

          if (item.variant) {
            const variants = data.variants || [];
            const updated = variants.map((v: any) =>
              v.id === item.variant!.id
                ? { ...v, stock: v.stock + item.quantity }
                : v
            );
            transaction.update(ref, {
              variants: updated,
              stock: (data.stock || 0) + item.quantity,
            });
          } else {
            transaction.update(ref, { stock: increment(item.quantity) });
          }
        });
      });
      console.log("Stock restored after cancellation");
    } catch (err) {
      console.error("Failed to restore stock:", err);
    }
  };

  const handleSuccess = async (res: any) => {
    try {
      if (!storeId) throw new Error("No store context");

      const orderData = {
        items: cart.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          imageUrl: item.image,
          selectedVariant: item.variant || null,
        })),
        total,
        shipping: {
          fullName: name,
          email: email,
          phone: phone,
          address: `${address}, ${city}`,
          country: "Ghana",
          city,
          street: address,
          zip: "",
        },
        status: "paid",
        paymentRef: res.reference,
        createdAt: serverTimestamp(),
        userId: user?.uid || "guest",
        customerEmail: user?.email || email,
        customerName: name,
        storeId, // Tag with storeId
      };

      await addDoc(collection(db, "stores", storeId, "orders"), orderData);

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
      console.error("Order save error", error);
      showAlert({
        title: "Order Error",
        message:
          "Payment successful but failed to save order. Contact support.",
        type: "error",
      });
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setLoading(false);
    restoreStock();
    showAlert({
      title: "Payment Cancelled",
      message: "You cancelled the payment process.",
      type: "info",
    });
  };

  const paystackWebViewRef = useRef<any>(null);

  const handlePayPress = async () => {
    if (!name || !email || !phone || !address || !city) {
      showAlert({
        title: "Missing Information",
        message: "Please fill in all shipping details.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    const stockReserved = await reserveStock();
    if (stockReserved) {
      paystackWebViewRef.current?.startTransaction();
    } else {
      setLoading(false);
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
                        GHS{" "}
                        {(
                          (item.variant?.price || item.price) * item.quantity
                        ).toFixed(2)}
                      </P>
                    </View>
                  ))}
                  <View className="h-px bg-zinc-200 my-2" />
                  <View className="flex-row justify-between items-center">
                    <P className="font-bold text-lg">Total</P>
                    <P className="font-black text-xl">GHS {total.toFixed(2)}</P>
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
                    <Paystack
                      paystackKey={
                        process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY || ""
                      }
                      billingEmail={email}
                      billingName={name}
                      billingMobile={phone}
                      amount={total}
                      onCancel={handleCancel}
                      onSuccess={handleSuccess}
                      ref={paystackWebViewRef}
                      currency="GHS"
                      channels={["card", "mobile_money"]}
                      autoStart={false}
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
