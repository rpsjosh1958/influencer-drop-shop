import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, ProductCard } from "@/components/shop/product-card";
import { ProductDetailsModal } from "@/components/shop/product-details-modal";
import { FloatingCart } from "@/components/shop/floating-cart";
import { SwipeableNotificationRow } from "@/components/swipeable-notification-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/context/cart-context";
import { MotiView } from "moti";
import { Bell, ShoppingCart, Zap, X } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  withTiming,
  Easing,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

import { useNotifications } from "@/context/notification-context";
import { useRouter } from "expo-router";

export default function ShopHome() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "read">(
    "all"
  );

  const { notifications, unreadCount, markAsRead } = useNotifications();

  // Filter Logic
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "unread") return !n.read;
    if (notifFilter === "read") return n.read;
    return true;
  });

  const { addToCart, cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Animation Values
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  // Effect to sync state changes (if closing/opening programmatically)
  useEffect(() => {
    const target = isNotificationOpen ? -width : 0;
    // Use withTiming for no bounce
    translateX.value = withTiming(target, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [isNotificationOpen]);

  // Gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20]) // Only activate if moved >20px horizontally
    .failOffsetY([-20, 20]) // Fail if moved >20px vertically (allows scrolling)
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      // Allow dragging left (negative) up to -width
      let newValue = contextX.value + e.translationX;
      if (newValue > 0) newValue = 0; // Cannot drag right past closed
      if (newValue < -width) newValue = -width; // Cannot drag left past open
      translateX.value = newValue;
    })
    .onEnd((e) => {
      // Snap logic
      if (translateX.value < -width / 2 || e.velocityX < -500) {
        // Snap to Open (Slide out)
        translateX.value = withTiming(
          -width,
          { duration: 300, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(setIsNotificationOpen)(true);
          }
        );
      } else {
        // Snap to Closed (Slide in)
        translateX.value = withTiming(
          0,
          { duration: 300, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(setIsNotificationOpen)(false);
          }
        );
      }
    });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const fetchProducts = async () => {
    try {
      const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(items);
    } catch (error) {
      console.log("Error fetching products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, []);

  return (
    <GestureHandlerRootView className="flex-1 bg-black">
      <StatusBar style={isNotificationOpen ? "light" : "dark"} />

      <GestureDetector gesture={panGesture}>
        <View className="flex-1 bg-black">
          {/* Notification Screen (Behind) */}
          <View className="absolute inset-0 bg-black z-0">
            <SafeAreaView className="flex-1 px-6">
              <View className="flex-row items-center justify-between py-4 border-b border-zinc-800 mb-4">
                <H1 className="text-white text-3xl font-black tracking-tighter">
                  NOTIFICATIONS
                </H1>
                <Pressable
                  onPress={() => setIsNotificationOpen(false)}
                  className="bg-zinc-800 p-2 rounded-full"
                >
                  <X color="white" size={24} />
                </Pressable>
              </View>

              {/* Filter Tabs */}
              <View className="flex-row gap-2 mb-6">
                {["all", "unread", "read"].map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setNotifFilter(f as any)}
                    className={`px-4 py-2 rounded-full border ${
                      notifFilter === f
                        ? "bg-white border-white"
                        : "bg-transparent border-zinc-700"
                    }`}
                  >
                    <P
                      className={`text-xs font-bold uppercase ${
                        notifFilter === f ? "text-black" : "text-zinc-500"
                      }`}
                    >
                      {f}
                    </P>
                  </Pressable>
                ))}
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="space-y-4 gap-4">
                  {filteredNotifications.map((item, index) => (
                    <SwipeableNotificationRow
                      key={item.id}
                      onDismiss={() => markAsRead(item.id)}
                      hint={index === 0 && isNotificationOpen}
                    >
                      <Pressable
                        onPress={() => {
                          if (!item.read) markAsRead(item.id);
                          setIsNotificationOpen(false); // Close drawer
                          if (item.type === "order_update") {
                            router.push({
                              pathname: "/(tabs)/orders",
                              params: { orderId: item.orderId },
                            });
                          }
                        }}
                        className={`bg-zinc-900 p-5 rounded-3xl border ${
                          item.read
                            ? "border-zinc-800"
                            : ""
                        } flex-row gap-4 w-full`}
                      >
                        <View className="h-12 w-12 bg-zinc-800 rounded-full items-center justify-center">
                          {item.type === "drop" ? (
                            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
                          ) : (
                            <ShoppingCart size={20} color="white" />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between items-start">
                            <P className="text-white font-bold text-lg">
                              {item.title}
                            </P>
                            <P className="text-zinc-500 text-xs">
                              {item.createdAt?.seconds
                                ? new Date(
                                    item.createdAt.seconds * 1000
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Now"}
                            </P>
                          </View>
                          <P className="text-zinc-400 mt-1 leading-relaxed">
                            {item.message}
                          </P>
                        </View>
                        {!item.read && (
                          <View className="h-2 w-2 rounded-full bg-cyan-400 absolute top-3 left-3" />
                        )}
                      </Pressable>
                    </SwipeableNotificationRow>
                  ))}
                  {filteredNotifications.length === 0 && (
                    <P className="text-zinc-500 text-center mt-10">
                      No notifications found
                    </P>
                  )}
                </View>
              </ScrollView>

              <View className="py-4 justify-end opacity-50">
                <P className="text-zinc-500 text-center text-xs uppercase tracking-widest">
                  Swipe right to close • Swipe items to read
                </P>
              </View>
            </SafeAreaView>
          </View>

          {/* Main Screen Content (Draggable) */}
          <Animated.View
            style={rStyle}
            className="flex-1 bg-white overflow-hidden shadow-2xl z-10"
          >
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 py-4">
                <View className="flex-row items-center gap-2">
                  <View className="h-4 w-4 bg-black rounded-full" />
                  <H1 className="text-xl tracking-tighter">DROP.</H1>
                </View>

                <Pressable
                  onPress={() => setIsNotificationOpen(!isNotificationOpen)}
                >
                  <Bell color="black" size={24} />
                  {unreadCount > 0 && (
                    <View className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full items-center justify-center border border-white">
                      <P className="text-[8px] text-white font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </P>
                    </View>
                  )}
                </Pressable>
              </View>

              {/* Scrolling Content */}
              <ScrollView
                contentContainerStyle={{ paddingBottom: 150 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="black"
                  />
                }
              >
                <View className="px-6 pt-4 pb-6">
                  <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 200 }}
                  >
                    <View className="flex-row items-center gap-2 mb-4 bg-black self-center px-3 py-1.5 rounded-full">
                      <Zap size={12} color="#fbbf24" fill="#fbbf24" />
                      <P className="text-white text-[10px] font-bold uppercase tracking-widest">
                        Live Drop Now Active
                      </P>
                    </View>
                    <H1 className="text-6xl font-black text-center tracking-tighter leading-none mb-4">
                      SECURE THE BAG.
                    </H1>
                    <P className="text-lg text-center text-zinc-500">
                      Limited edition drops. Once they're gone, they're gone
                      forever. Don't lack.
                    </P>
                  </MotiView>
                </View>

                <View className="px-4">
                  {loading ? (
                    <View className="flex-row flex-wrap justify-between">
                      {[1, 2, 3, 4].map((i) => (
                        <View key={i} className="w-[48%] mb-6 space-y-3">
                          <Skeleton width="100%" height={256} radius={20} />
                          <Skeleton width="60%" height={24} radius={4} />
                          <Skeleton width="40%" height={16} radius={4} />
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="flex-row flex-wrap justify-between">
                      {products.map((product, i) => (
                        <View key={product.id} className="w-[48%]">
                          <ProductCard
                            product={product}
                            index={i}
                            onPress={setSelectedProduct}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </GestureDetector>

      <FloatingCart />

      <ProductDetailsModal
        isVisible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onAddToCart={(p, v) => {
          addToCart({
            id: p.id,
            name: p.name,
            price: v?.price || p.price,
            image:
              p.images && p.images[0]
                ? p.images[0]
                : p.imageUrl || "https://via.placeholder.com/300",
            variant: v,
          });
        }}
      />
    </GestureHandlerRootView>
  );
}
