import React, { useEffect, forwardRef, useImperativeHandle } from "react";
import { View, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useDerivedValue,
  interpolateColor,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { ChevronsRight, Lock, Check } from "lucide-react-native";
import { P } from "./text";
import { ActivityIndicator } from "react-native";

export interface SlideToPayRef {
  reset: () => void;
}

interface SlideToPayProps {
  onSuccess: () => void;
  amount: number;
  isLoading?: boolean;
}

const BUTTON_HEIGHT = 64;
const PADDING = 4;
const THUMB_SIZE = BUTTON_HEIGHT - PADDING * 2;

export const SlideToPay = forwardRef<SlideToPayRef, SlideToPayProps>(
  ({ onSuccess, amount, isLoading = false }, ref) => {
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const trackWidth = useSharedValue(0);
    const isComplete = useSharedValue(false);

    useImperativeHandle(ref, () => ({
      reset: () => {
        translateX.value = withSpring(0);
        isComplete.value = false;
      },
    }));

    // Dynamic thumb width calculation
    // Let's make the thumb wide enough to fit content initially, e.g. 140px or auto if possible.
    // Since we are using absolute positioning for the thumb, auto width is tricky without onLayout loop.
    // We'll use a fixed but wider width.
    const INITIAL_THUMB_WIDTH = 140;

    useEffect(() => {
      if (!isLoading && isComplete.value) {
        if (translateX.value > 0) {
          translateX.value = withSpring(0);
          isComplete.value = false;
        }
      }
    }, [isLoading]);

    const pan = Gesture.Pan()
      .enabled(!isLoading)
      .onStart(() => {
        startX.value = translateX.value;
      })
      .onUpdate((e) => {
        if (isComplete.value || isLoading) return;
        const maxDrag = trackWidth.value - INITIAL_THUMB_WIDTH - PADDING * 2;
        const newValue = startX.value + e.translationX;
        translateX.value = Math.max(0, Math.min(newValue, maxDrag));
      })
      .onEnd(() => {
        if (isComplete.value || isLoading) return;
        const maxDrag = trackWidth.value - INITIAL_THUMB_WIDTH - PADDING * 2;

        // Threshold to trigger (e.g. 90%)
        if (translateX.value > maxDrag * 0.9) {
          // Snap to end
          translateX.value = withSpring(maxDrag, { damping: 20 });
          isComplete.value = true;

          runOnJS(Haptics.notificationAsync)(
            Haptics.NotificationFeedbackType.Success
          );
          runOnJS(onSuccess)();
        } else {
          // Snap back
          translateX.value = withSpring(0);
        }
      });

    const rThumbStyle = useAnimatedStyle(() => {
      if (trackWidth.value === 0) return {};
      return {
        transform: [{ translateX: translateX.value }],
        width: withSpring(INITIAL_THUMB_WIDTH), // Maintain shape
        backgroundColor:
          isComplete.value || isLoading
            ? withTiming("#16a34a")
            : withTiming("black"), // green-600
      };
    });

    const rTrackFillStyle = useAnimatedStyle(() => {
      return {
        width: translateX.value + INITIAL_THUMB_WIDTH, // Fill follows the thumb
        opacity: interpolate(translateX.value, [0, 50], [0, 1]), // Fade in
      };
    });

    const rTextStyle = useAnimatedStyle(() => {
      const opacity = interpolate(
        translateX.value,
        [0, trackWidth.value / 3],
        [1, 0]
      );
      return { opacity };
    });

    return (
      <View
        className="w-full bg-zinc-100 rounded-full overflow-hidden relative border border-zinc-200"
        onLayout={(e) => {
          trackWidth.value = e.nativeEvent.layout.width;
        }}
        style={{ height: BUTTON_HEIGHT }}
      >
        {/* Background Fill Effect (Visual Trail) */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: "#f4f4f5", // slightly darker zinc
              zIndex: 0,
            },
            rTrackFillStyle,
          ]}
        />

        {/* Background Text prompt */}
        <View className="absolute inset-0 items-center justify-end flex-row pointer-events-none pr-8">
          <Animated.View
            style={[
              { flexDirection: "row", alignItems: "center", gap: 4 },
              rTextStyle,
            ]}
          >
            <P className="text-zinc-400 font-bold text-sm uppercase tracking-widest">
              Slide to Pay
            </P>
            <ChevronsRight size={16} color="#a1a1aa" />
          </Animated.View>
        </View>

        {/* Draggable Thumb */}
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[
              {
                position: "absolute",
                left: PADDING,
                top: PADDING,
                bottom: PADDING,
                backgroundColor: "black",
                borderRadius: 100,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
              },
              rThumbStyle,
            ]}
          >
            {isLoading ? (
              <View className="flex-row items-center justify-center w-full h-full">
                <ActivityIndicator color="white" />
              </View>
            ) : isComplete.value ? (
              <View className="flex-row items-center justify-center w-full h-full">
                <Check size={24} color="white" />
              </View>
            ) : (
              <View className="flex-row gap-2 items-center px-4">
                <View className="bg-zinc-800 p-1.5 rounded-full">
                  <Lock size={14} color="white" />
                </View>
                <P className="text-white font-bold text-sm tracking-wide">
                  GHS {amount.toFixed(2)}
                </P>
              </View>
            )}
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

SlideToPay.displayName = "SlideToPay";
