import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { X, Search, Plus, Minus, Trash2, ShoppingBag } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatCurrency } from "@/lib/format";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  runTransaction,
  doc,
} from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images?: string[];
  imageUrl?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
}

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

interface ManualOrderModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  storeId: string;
  storeName: string;
}

export function ManualOrderModal({
  visible,
  onClose,
  products = [],
  storeId,
  storeName,
}: ManualOrderModalProps) {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderStatus, setOrderStatus] = useState("paid"); // paid, delivered, open

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.variant?.price || item.product.price;
      return acc + price * item.quantity;
    }, 0);
  }, [cart]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && i.variant?.id === variant?.id
      );
      if (existing) {
        const maxStock = variant ? variant.stock : product.stock;
        if (existing.quantity >= maxStock) return prev;

        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      const maxStock = item.variant ? item.variant.stock : item.product.stock;

      const newQ = item.quantity + delta;
      if (newQ > 0 && newQ <= maxStock) {
        newCart[index] = { ...item, quantity: newQ };
      }
      return newCart;
    });
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return Alert.alert("Error", "Please add at least one item.");
    if (!customerName.trim()) return Alert.alert("Error", "Please enter a customer name.");
    if (!storeId) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read all products
        const productReads = await Promise.all(
          cart.map(async (item) => {
            const ref = doc(db, "stores", storeId, "products", item.product.id);
            const snapshot = await transaction.get(ref);
            return { ref, snapshot, item };
          })
        );

        // 2. Validate
        for (const { snapshot, item } of productReads) {
          if (!snapshot.exists()) throw new Error(`Product ${item.product.name} no longer exists.`);
          const productData = snapshot.data();

          if (item.variant) {
            const variants = productData.variants || [];
            const variant = variants.find((v: any) => v.id === item.variant!.id);
            if (!variant) throw new Error(`Variant ${item.variant.name} no longer exists.`);
            if (variant.stock < item.quantity) {
              throw new Error(`Not enough stock for ${item.product.name} (${item.variant.name}). Only ${variant.stock} left.`);
            }
          } else {
            const currentStock = productData.stock ?? 0;
            if (currentStock < item.quantity) {
              throw new Error(`Not enough stock for ${item.product.name}. Only ${currentStock} left.`);
            }
          }
        }

        // 3. Write updates
        for (const { ref, snapshot, item } of productReads) {
          const productData = snapshot.data()!;
          if (item.variant) {
            const updatedVariants = (productData.variants || []).map((v: any) =>
              v.id === item.variant!.id ? { ...v, stock: v.stock - item.quantity } : v
            );
            const newTotalStock = (productData.stock ?? 0) - item.quantity;
            transaction.update(ref, { variants: updatedVariants, stock: newTotalStock });
          } else {
            const newStock = (productData.stock ?? 0) - item.quantity;
            transaction.update(ref, { stock: newStock });
          }
        }
      });

      // 4. Create Order
      const orderItems = cart.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        price: c.variant?.price || c.product.price,
        quantity: c.quantity,
        selectedVariant: c.variant || null,
        imageUrl: c.product.images?.[0] || c.product.imageUrl || "",
      }));

      const orderData = {
        items: orderItems,
        total: cartTotal,
        shipping: {
          fullName: customerName,
          email: customerEmail || "manual@store.com",
          phone: customerPhone,
          address: "Manual Entry/In-Person",
        },
        status: orderStatus,
        paymentMethod: "manual",
        isManual: true,
        createdAt: serverTimestamp(),
        userId: "manual_entry",
        customerEmail: customerEmail || "manual@store.com",
        customerName: customerName,
        storeId,
        storeName: storeName || "Store",
      };

      await addDoc(collection(db, "stores", storeId, "orders"), orderData);

      // 5. Invalidate Queries to refresh order & product lists
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-products"] });

      // Reset
      setCart([]);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      onClose();
    } catch (error: any) {
      console.error("Manual order error:", error);
      Alert.alert("Order Failed", error.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }} edges={["top", "bottom"]}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between p-4 border-b border-zinc-100">
            <Text className="text-xl font-black">Add Order</Text>
            <TouchableOpacity onPress={onClose} className="p-2 bg-zinc-100 rounded-full">
              <X size={20} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1" stickyHeaderIndices={[0]}>
            <View className="bg-white p-4 border-b border-zinc-100">
              <View className="flex-row items-center bg-zinc-100 px-3 py-2 rounded-xl">
                <Search size={16} color="#71717a" />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search products..."
                  className="flex-1 ml-2 text-base"
                  style={{ height: 35 }}
                />
              </View>
            </View>

            {/* Product List */}
            {filteredProducts.map((p) => (
              <View key={p.id} className="p-4 border-b border-zinc-100">
                <Text className="font-bold text-base">{p.name}</Text>
                {!p.hasVariants && (
                  <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-zinc-500 text-sm">{formatCurrency(p.price)} • {p.stock} in stock</Text>
                    <TouchableOpacity
                      disabled={p.stock <= 0}
                      onPress={() => addToCart(p)}
                      className={`px-4 py-2 rounded-lg ${p.stock <= 0 ? "bg-zinc-200" : "bg-black"}`}
                    >
                      <Text className={`font-bold text-sm ${p.stock <= 0 ? "text-zinc-500" : "text-white"}`}>Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {p.hasVariants && (
                  <View className="mt-3 gap-2">
                    {p.variants?.map((v) => (
                      <View key={v.id} className="flex-row items-center justify-between bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                        <View>
                          <Text className="font-bold text-sm">{v.name}</Text>
                          <Text className="text-zinc-500 text-xs">{formatCurrency(v.price)} • {v.stock} in stock</Text>
                        </View>
                        <TouchableOpacity
                          disabled={v.stock <= 0}
                          onPress={() => addToCart(p, v)}
                          className={`p-2 rounded-lg ${v.stock <= 0 ? "bg-zinc-200" : "bg-black"}`}
                        >
                          <Plus size={16} color={v.stock <= 0 ? "#71717a" : "#fff"} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Bottom Panel: Cart & Customer Info */}
          {(cart.length > 0 || customerName.length > 0) && (
            <View className="border-t border-zinc-200 bg-white shadow-2xl">
              <ScrollView style={{ maxHeight: 300 }} className="p-4" keyboardShouldPersistTaps="handled">
                {cart.length > 0 && (
                  <View className="mb-4">
                    <Text className="font-bold text-sm mb-2 text-zinc-500 uppercase tracking-widest">Order Items</Text>
                    {cart.map((item, idx) => (
                      <View key={idx} className="flex-row items-center justify-between mb-3 bg-zinc-50 p-3 rounded-xl">
                        <View className="flex-1 mr-3">
                          <Text className="font-bold text-sm" numberOfLines={1}>{item.product.name}</Text>
                          {item.variant && <Text className="text-xs text-zinc-500">{item.variant.name}</Text>}
                          <Text className="font-bold mt-1">{formatCurrency(item.variant?.price || item.product.price)}</Text>
                        </View>
                        <View className="flex-row items-center bg-white border border-zinc-200 rounded-lg p-1">
                          <TouchableOpacity onPress={() => updateQuantity(idx, -1)} className="p-2"><Minus size={14} color="#000" /></TouchableOpacity>
                          <Text className="px-2 font-bold text-base w-8 text-center">{item.quantity}</Text>
                          <TouchableOpacity onPress={() => updateQuantity(idx, 1)} className="p-2"><Plus size={14} color="#000" /></TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => removeCartItem(idx)} className="p-2 ml-2">
                          <Trash2 size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View className="mb-6">
                  <Text className="font-bold text-sm mb-2 text-zinc-500 uppercase tracking-widest">Customer Details</Text>
                  <TextInput
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Customer Name *"
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-3 text-base"
                  />
                  <TextInput
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    placeholder="Phone Number (Optional)"
                    keyboardType="phone-pad"
                    className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 mb-3 text-base"
                  />
                  
                  {/* Status Toggles */}
                  <View className="flex-row gap-2 mt-2">
                    {["open", "paid", "delivered"].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => setOrderStatus(status)}
                        className={`flex-1 py-2 rounded-lg border flex items-center justify-center ${
                          orderStatus === status ? "bg-black border-black" : "bg-white border-zinc-200"
                        }`}
                      >
                        <Text className={`text-xs font-bold uppercase ${orderStatus === status ? "text-white" : "text-black"}`}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </ScrollView>

              <View className="p-4 bg-zinc-50 border-t border-zinc-200">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-bold text-zinc-500">Total</Text>
                  <Text className="font-black text-2xl">{formatCurrency(cartTotal)}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting || cart.length === 0 || !customerName.trim()}
                  className={`py-4 rounded-xl flex-row items-center justify-center ${
                    isSubmitting || cart.length === 0 || !customerName.trim() ? "bg-zinc-300" : "bg-black"
                  }`}
                >
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-black text-lg">Complete Order</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
