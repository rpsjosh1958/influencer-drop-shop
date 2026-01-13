import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  Dimensions,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  FadeInDown,
  FadeOutUp,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import {
  ShoppingCart,
  X,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  LogIn,
} from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { useCart } from "@/context/cart-context";
import { useAlert } from "@/context/alert-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Constants for Button State
const BUTTON_SIZE = 60;
// Higher position to clear tab bar
const BUTTON_BOTTOM = 36;
const BUTTON_RIGHT = 24;

function CartItemRow({ item, index, onUpdate, onRemove }: any) {
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  // Auto-slide hint on mount (only for first item)
  useEffect(() => {
    if (index === 0) {
      translateX.value = withDelay(
        500,
        withSequence(
          withTiming(-60, { duration: 400 }),
          withDelay(800, withTiming(0, { duration: 400 }))
        )
      );
    }
  }, [index]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Activate on horizontal move
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      // Only allow sliding left
      let newVal = contextX.value + e.translationX;
      if (newVal > 0) newVal = 0;
      if (newVal < -80) newVal = -80; // Clamp max drag
      translateX.value = newVal;
    })
    .onEnd(() => {
      // Snap logic
      if (translateX.value < -40) {
        translateX.value = withTiming(-60);
      } else {
        translateX.value = withTiming(0);
      }
    });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const rIconStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, -20], [0, 1]);
    const scale = interpolate(translateX.value, [0, -40], [0.8, 1]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View className="mb-6 relative h-[110px] w-full">
      {/* Delete Action Background */}
      <View className="absolute right-0 top-0 bottom-0 w-20 flex-row items-center justify-center">
        <Animated.View style={rIconStyle}>
          <Pressable
            onPress={() => onRemove(item)}
            className="bg-red-500 h-10 w-10 rounded-full items-center justify-center shadow-sm"
          >
            <Trash2 size={20} color="white" />
          </Pressable>
        </Animated.View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            {
              backgroundColor: "white",
              flexDirection: "row",
              height: "100%",
              gap: 16,
            },
            rStyle,
          ]}
        >
          <Image
            source={{ uri: item.image }}
            className="w-28 h-full rounded-2xl bg-zinc-100"
            resizeMode="cover"
          />

          <View className="flex-1 justify-between py-1 bg-white">
            <View>
              <View className="flex-row justify-between items-start pr-4">
                <P
                  className="font-bold text-lg leading-tight flex-1 mr-2"
                  numberOfLines={1}
                >
                  {item.name}
                </P>
              </View>
              {item.variant && (
                <P className="text-zinc-500 text-sm mt-1">
                  {item.variant.name}
                </P>
              )}
              <P className="text-zinc-900 font-bold mt-2 text-lg">
                GHS {item.variant?.price || item.price}
              </P>
            </View>

            <View className="flex-row items-center gap-3 bg-zinc-50 rounded-lg p-1 self-start border border-zinc-100">
              <Pressable
                onPress={() => onUpdate(item, -1)}
                className="p-1 bg-white rounded-md shadow-sm active:scale-90 transition-transform"
              >
                <Minus size={16} color="black" />
              </Pressable>
              <P className="font-bold w-6 text-center text-lg">
                {item.quantity}
              </P>
              <Pressable
                onPress={() => onUpdate(item, 1)}
                className="p-1 bg-white rounded-md shadow-sm active:scale-90 transition-transform"
              >
                <Plus size={16} color="black" />
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function FloatingCart() {
  const { cart, updateQuantity, removeFromCart, total, clearCart } = useCart();
  const { showAlert } = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return unsub;
  }, []);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Shared Values for Animation
  const expansion = useSharedValue(0);

  useEffect(() => {
    if (cartCount === 0 && isOpen) {
      toggleOpen(false);
    }
  }, [cartCount]);

  const toggleOpen = (open: boolean) => {
    if (open) {
      setIsOpen(true);
      // Linear/Ease expansion, no spring bounce
      expansion.value = withTiming(1, {
        duration: 350,
        easing: Easing.out(Easing.quad),
      });
    } else {
      expansion.value = withTiming(
        0,
        { duration: 300, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(setIsOpen)(false);
        }
      );
    }
  };

  const handleRemove = (item: any) => {
    showAlert({
      title: "Remove Item?",
      message: `Are you sure you want to remove ${item.name} from your bag?`,
      type: "error",
      confirmLabel: "Remove",
      onConfirm: () => removeFromCart(item.id, item.variant?.id),
    });
  };

  const handleClear = () => {
    showAlert({
      title: "Clear Cart?",
      message: "This will remove all items from your bag.",
      type: "error",
      confirmLabel: "Clear All",
      onConfirm: () => clearCart(),
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    const width = interpolate(
      expansion.value,
      [0, 1],
      [BUTTON_SIZE, SCREEN_WIDTH]
    );
    const height = interpolate(
      expansion.value,
      [0, 1],
      [BUTTON_SIZE, SCREEN_HEIGHT]
    );
    const borderRadius = interpolate(expansion.value, [0, 1], [30, 0]);

    const right = interpolate(expansion.value, [0, 1], [BUTTON_RIGHT, 0]);
    // Animate bottom from floated position (20) to 0
    const bottom = interpolate(expansion.value, [0, 1], [100, 0]); // Lowered from 134 to 100

    return {
      width,
      height,
      borderRadius,
      right,
      bottom,
    };
  });

  const buttonContentStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(expansion.value, [0, 0.2], [1, 0]),
      transform: [{ scale: interpolate(expansion.value, [0, 0.2], [1, 0]) }],
    };
  });

  const modalContentStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(expansion.value, [0.4, 1], [0, 1]),
      transform: [
        { translateY: interpolate(expansion.value, [0.4, 1], [50, 0]) },
      ],
    };
  });

  if (cartCount === 0 && !isOpen) return null;

  return (
    <>
      {isOpen && (
        <Animated.View
          className="absolute inset-0 bg-black/60 z-40"
          entering={FadeInDown.duration(300)}
          exiting={FadeOutUp}
        />
      )}

      <Animated.View
        style={[
          {
            position: "absolute",
            backgroundColor: isOpen ? "white" : "black",
            overflow: "hidden",
            zIndex: 50,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 10,
          },
          animatedStyle,
        ]}
      >
        {!isOpen && (
          <Pressable
            className="w-full h-full items-center justify-center flex-row gap-2"
            onPress={() => toggleOpen(true)}
          >
            <Animated.View
              style={[
                { flexDirection: "row", alignItems: "center", gap: 8 },
                buttonContentStyle,
              ]}
            >
              <ShoppingCart size={20} color="white" />
              <P className="text-white font-bold">{cartCount}</P>
            </Animated.View>
          </Pressable>
        )}

        {isOpen && (
          <Animated.View style={[{ flex: 1 }, modalContentStyle]}>
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
                <H1 className="text-2xl font-black">YOUR BAG ({cartCount})</H1>
                <View className="flex-row items-center gap-4">
                  <Pressable onPress={handleClear}>
                    <P className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                      Clear
                    </P>
                  </Pressable>
                  <Pressable
                    onPress={() => toggleOpen(false)}
                    className="p-2 bg-zinc-100 rounded-full"
                  >
                    <X size={20} color="black" />
                  </Pressable>
                </View>
              </View>

              {/* Cart Items Logic */}
              <ScrollView
                className="flex-1 p-6"
                showsVerticalScrollIndicator={false}
              >
                {cart.map((item, i) => (
                  <CartItemRow
                    key={`${item.id}-${item.variant?.id || "base"}`}
                    item={item}
                    index={i}
                    onUpdate={(item: any, delta: number) => {
                      if (delta < 0 && item.quantity === 1) {
                        handleRemove(item);
                      } else {
                        updateQuantity(item.id, item.variant?.id, delta);
                      }
                    }}
                    onRemove={handleRemove}
                  />
                ))}
              </ScrollView>

              <View className="px-6 pt-3 pb-24 border-t border-zinc-100 bg-zinc-50">
                <View className="flex-row justify-between mb-4">
                  <P className="text-zinc-500 font-medium tracking-wide">
                    TOTAL
                  </P>
                  <H1 className="text-2xl font-black">
                    GHS {total.toFixed(2)}
                  </H1>
                </View>

                {user ? (
                  <Pressable
                    className="bg-black w-full py-4 rounded-2xl flex-row items-center justify-center gap-3 active:scale-95 transition-transform"
                    onPress={() => {
                      toggleOpen(false);
                      router.push("/checkout");
                    }}
                  >
                    <P className="text-white font-bold text-lg uppercase tracking-wider">
                      Checkout
                    </P>
                  </Pressable>
                ) : (
                  <Pressable
                    className="bg-zinc-900 w-full py-4 rounded-2xl flex-row items-center justify-center gap-3 active:scale-95 transition-transform"
                    onPress={() => {
                      toggleOpen(false);
                      router.push("/(auth)/login");
                    }}
                  >
                    <P className="text-white font-bold text-lg uppercase tracking-wider">
                      Login to Checkout
                    </P>
                    <LogIn size={20} color="white" />
                  </Pressable>
                )}
              </View>
            </SafeAreaView>
          </Animated.View>
        )}
      </Animated.View>
    </>
  );
}
