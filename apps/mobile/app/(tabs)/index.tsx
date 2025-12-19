import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, ProductCard } from "@/components/shop/product-card";
import { ProductDetailsModal } from "@/components/shop/product-details-modal";
import { FloatingCart } from "@/components/shop/floating-cart";
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

export default function ShopHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

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
    // Only scale slightly or not at all if user wants "just slide"
    // User said "bounce like effect after slide... just let slide happen"
    // Scaling contributed to "bounce" feel if not linear with spring.
    // I'll keep slight scale but withTiming will make it rigid/smooth without wobble.
    const scale = interpolate(
      translateX.value,
      [0, -width],
      [1, 1], // Removed scale effect as requested "just let slide happen" implies simplicity? "scale: 1" in previous request for full screen.
      // Actually user said "slide back... bounce like effect".
      // Spring causes bounce. Scale is fine. I will set scale to 1 to be safe and simple.
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        // { scale }
      ],
      // borderRadius: 0 // Remove border radius change for clean slide
    };
  });

  useEffect(() => {
    async function fetchProducts() {
      try {
        const q = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
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
      }
    }
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
              <View className="flex-row items-center justify-between py-4 border-b border-zinc-800 mb-6">
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

              <ScrollView
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="space-y-4 gap-6">
                  {/* Notification Items */}
                  <View className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex-row gap-4">
                    <View className="h-12 w-12 bg-zinc-800 rounded-full items-center justify-center">
                      <Zap size={20} color="#fbbf24" fill="#fbbf24" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-start">
                        <P className="text-white font-bold text-lg">
                          New Drop Live
                        </P>
                        <P className="text-zinc-500 text-xs">2m ago</P>
                      </View>
                      <P className="text-zinc-400 mt-1 leading-relaxed">
                        The Essentials Collection is now available.
                      </P>
                    </View>
                  </View>
                  <View className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex-row gap-4">
                    <View className="h-12 w-12 bg-zinc-800 rounded-full items-center justify-center">
                      <ShoppingCart size={20} color="white" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-start">
                        <P className="text-white font-bold text-lg">
                          Order Shipped
                        </P>
                        <P className="text-zinc-500 text-xs">1d ago</P>
                      </View>
                      <P className="text-zinc-400 mt-1 leading-relaxed">
                        Your order #10234 is on the way. Track your package now.
                      </P>
                    </View>
                  </View>
                  {/* Duplicate items to test scrolling if needed */}
                  <View className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 flex-row gap-4">
                    <View className="h-12 w-12 bg-zinc-800 rounded-full items-center justify-center">
                      <Zap size={20} color="#fbbf24" fill="#fbbf24" />
                    </View>
                    <View className="flex-1">
                      <View className="flex-row justify-between items-start">
                        <P className="text-white font-bold text-lg">
                          Restock Alert
                        </P>
                        <P className="text-zinc-500 text-xs">1h ago</P>
                      </View>
                      <P className="text-zinc-400 mt-1 leading-relaxed">
                        The oversized hoodie is back in stock.
                      </P>
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View className="py-4 justify-end opacity-50">
                <P className="text-zinc-500 text-center text-xs uppercase tracking-widest">
                  Swipe right to close
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
                  <View className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                </Pressable>
              </View>

              {/* Scrolling Content */}
              <ScrollView contentContainerStyle={{ paddingBottom: 150 }}>
                <View className="px-6 pt-8 pb-12">
                  <MotiView
                    from={{ opacity: 0, translateY: 30 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 200 }}
                  >
                    <View className="flex-row items-center gap-2 mb-4 bg-black self-start px-3 py-1.5 rounded-full">
                      <Zap size={12} color="#fbbf24" fill="#fbbf24" />
                      <P className="text-white text-[10px] font-bold uppercase tracking-widest">
                        Live Drop Active
                      </P>
                    </View>
                    <H1 className="text-6xl font-black tracking-tighter leading-none mb-4">
                      SECURE{"\n"}THE BAG.
                    </H1>
                    <P className="text-lg text-zinc-500 max-w-xs">
                      Limited edition drops. Once they're gone, they're gone
                      forever. Don't lack.
                    </P>
                  </MotiView>
                </View>

                <View className="px-4">
                  {loading ? (
                    <View className="flex-row flex-wrap justify-between">
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          className="w-[48%] aspect-[4/5] bg-zinc-100 rounded-2xl mb-4 animate-pulse"
                        />
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
