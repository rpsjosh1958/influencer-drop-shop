import React, { useEffect, useState } from "react";
import { View, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Trash2 } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// How far a row sits open to show its delete button.
const REVEAL_WIDTH = 88;

interface SwipeableNotificationRowProps {
  children: React.ReactNode;
  onDismiss: () => void;
  hint?: boolean;
}

/**
 * Swipe left to reveal a delete button (tap it to delete), or swipe most of
 * the way across to delete in one go. Only left swipes are claimed, so a
 * right swipe still reaches the parent (e.g. closing the shop's
 * notification panel). Tapping the row while it's open closes it.
 */
export function SwipeableNotificationRow({
  children,
  onDismiss,
  hint,
}: SwipeableNotificationRowProps) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(100); // Intial height, will be animated to 0
  const opacity = useSharedValue(1);
  const contextX = useSharedValue(0);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-slide hint on mount
  useEffect(() => {
    if (hint) {
      translateX.set(withDelay(
        800,
        withSequence(
          withTiming(-60, { duration: 400 }),
          withDelay(800, withTiming(0, { duration: 400 }))
        )
      ));
    }
  }, [hint]);

  const dismiss = () => {
    "worklet";
    translateX.set(withTiming(-SCREEN_WIDTH, { duration: 250 }, (finished) => {
      if (finished) {
        rowHeight.set(
          withTiming(0, { duration: 200 }, (f2) => {
            if (f2) runOnJS(onDismiss)();
          })
        );
        opacity.set(withTiming(0));
      }
    }));
  };

  const close = () => {
    translateX.set(withSpring(0));
    setIsOpen(false);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX(-10) // left swipes only…
    .failOffsetX(10) // …a right swipe is the parent's
    .failOffsetY([-15, 15]) // vertical movement is the list scrolling
    .onStart(() => {
      contextX.set(translateX.value);
    })
    .onUpdate((event) => {
      translateX.set(Math.min(0, contextX.value + event.translationX));
    })
    .onEnd((event) => {
      if (translateX.value < -SCREEN_WIDTH * 0.5 || event.velocityX < -1200) {
        dismiss();
      } else if (translateX.value < -REVEAL_WIDTH / 2) {
        translateX.set(withSpring(-REVEAL_WIDTH));
        runOnJS(setIsOpen)(true);
      } else {
        translateX.set(withSpring(0));
        runOnJS(setIsOpen)(false);
      }
    });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const rContainerStyle = useAnimatedStyle(() => {
    return {
      height: rowHeight.value === 100 ? undefined : rowHeight.value,
      opacity: opacity.value,
      overflow: "hidden",
      marginBottom: rowHeight.value === 0 ? 0 : 16,
    };
  });

  const rIconStyle = useAnimatedStyle(() => {
    const opacityVal = interpolate(translateX.value, [0, -50], [0, 1]);
    return { opacity: opacityVal };
  });

  return (
    <Animated.View style={rContainerStyle}>
      {/* Background (Delete Action) */}
      <View className="absolute inset-0 bg-red-500 rounded-3xl flex-row justify-end">
        <Pressable
          onPress={dismiss}
          disabled={!isOpen}
          accessibilityLabel="Delete notification"
          style={{ width: REVEAL_WIDTH }}
          className="h-full items-center justify-center"
        >
          <Animated.View style={rIconStyle}>
            <Trash2 color="white" size={24} />
          </Animated.View>
        </Pressable>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rStyle}>
          {children}
          {/* While open, a tap on the row closes it instead of opening the
              notification. */}
          {isOpen && (
            <Pressable
              onPress={close}
              className="absolute inset-0"
              accessibilityLabel="Close delete action"
            />
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
