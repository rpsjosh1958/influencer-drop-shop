import React, { useEffect } from "react";
import { View, Dimensions, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Import local assets
const IMAGES = [
  require("../../assets/landing/item-1.jpg"),
  require("../../assets/landing/item-2.jpg"),
  require("../../assets/landing/item-3.jpg"),
  require("../../assets/landing/item-4.jpg"),
  require("../../assets/landing/item-5.jpg"),
  require("../../assets/landing/item-6.jpg"),
  require("../../assets/landing/item-7.jpg"),
  require("../../assets/landing/item-8.jpg"),
  require("../../assets/landing/item-9.jpg"),
  require("../../assets/landing/item-10.jpg"),
  require("../../assets/landing/item-11.jpg"),
  require("../../assets/landing/item-12.jpg"),
];

// Split into 3 columns
const COL_1 = [
  ...IMAGES.slice(0, 4),
  ...IMAGES.slice(0, 4),
  ...IMAGES.slice(0, 4),
];
const COL_2 = [
  ...IMAGES.slice(4, 8),
  ...IMAGES.slice(4, 8),
  ...IMAGES.slice(4, 8),
];
const COL_3 = [
  ...IMAGES.slice(8, 12),
  ...IMAGES.slice(8, 12),
  ...IMAGES.slice(8, 12),
];

const COLUMN_WIDTH = width / 3;
const IMAGE_HEIGHT = COLUMN_WIDTH * 1.4; // Aspect ratio
const GAP = 10;

function InfiniteColumn({
  images,
  duration,
  delay = 0,
  reverse = false,
}: {
  images: any[];
  duration: number;
  delay?: number;
  reverse?: boolean;
}) {
  const translateY = useSharedValue(reverse ? -1000 : 0);

  useEffect(() => {
    // Total height of the pattern (1 set of images)
    // We have 3 sets of images in the array (original + 2 copies) to ensure smooth looping
    // Actually, we usually need 2 sets. Let's say we scroll by the height of 1 set.
    // Length is 12 (3 sets of 4). Pattern is 4 images.
    const patternHeight = (IMAGE_HEIGHT + GAP) * 4;

    if (reverse) {
      // Start from bottom, move up? Or start top, move down?
      // Let's just do standard top-to-bottom or bottom-to-top scrolling
      translateY.value = withDelay(
        delay,
        withRepeat(
          withTiming(0, {
            duration: duration,
            easing: Easing.linear,
          }),
          -1, // Infinite
          false // No reverse
        )
      );
    } else {
      // Scroll UP (translate Y goes negative)
      translateY.value = withDelay(
        delay,
        withRepeat(
          withTiming(-patternHeight, {
            duration: duration,
            easing: Easing.linear,
          }),
          -1,
          false
        )
      );
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <View style={{ width: COLUMN_WIDTH, overflow: "hidden" }}>
      <Animated.View
        style={[{ flexDirection: "column", gap: GAP }, animatedStyle]}
      >
        {images.map((img, i) => (
          <Image
            key={i}
            source={img}
            style={{
              width: COLUMN_WIDTH - 4,
              height: IMAGE_HEIGHT,
              borderRadius: 12,
              marginHorizontal: 2,
            }}
            resizeMode="cover"
          />
        ))}
      </Animated.View>
    </View>
  );
}

export function WallOfDrops() {
  return (
    <View className="absolute inset-0 bg-black flex-row justify-between opacity-50">
      <InfiniteColumn images={COL_1} duration={15000} delay={0} />
      <InfiniteColumn images={COL_2} duration={25000} delay={-500} reverse />
      <InfiniteColumn images={COL_3} duration={20000} delay={-1000} />

      {/* VIGNETTE / DIMMING OVERLAY */}
      <View className="absolute inset-0 bg-black/40" />
      <View className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black" />
    </View>
  );
}
