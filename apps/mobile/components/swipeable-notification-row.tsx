import React, { useEffect } from "react";
import { View, Pressable, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  withDelay,
  withSequence,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Trash2 } from "lucide-react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface SwipeableNotificationRowProps {
  children: React.ReactNode;
  onDismiss: () => void;
  hint?: boolean;
}

export function SwipeableNotificationRow({
  children,
  onDismiss,
  hint,
}: SwipeableNotificationRowProps) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(100); // Intial height, will be animated to 0
  const opacity = useSharedValue(1);
  const contextX = useSharedValue(0);

  // Auto-slide hint on mount
  useEffect(() => {
    if (hint) {
      translateX.value = withDelay(
        800,
        withSequence(
          withTiming(-60, { duration: 400 }),
          withDelay(800, withTiming(0, { duration: 400 }))
        )
      );
    }
  }, [hint]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((event) => {
      // Only drag left
      let nextX = contextX.value + event.translationX;
      if (nextX > 0) nextX = 0; // Prevent right drag
      translateX.value = nextX;
    })
    .onEnd((event) => {
      // If dragged past threshold or flicked fast
      if (translateX.value < -SCREEN_WIDTH * 0.3 || event.velocityX < -800) {
        // Dismiss
        translateX.value = withTiming(
          -SCREEN_WIDTH,
          { duration: 300 },
          (finished) => {
            if (finished) {
              rowHeight.value = withTiming(0, { duration: 200 }, (f2) => {
                if (f2) runOnJS(onDismiss)();
              });
              opacity.value = withTiming(0);
            }
          }
        );
      } else {
        // Bounce back
        translateX.value = withSpring(0);
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
      <View className="absolute inset-0 bg-red-500 rounded-3xl flex-row items-center justify-end pr-8">
        <Animated.View style={rIconStyle}>
          <Trash2 color="white" size={24} />
        </Animated.View>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rStyle}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
