import { useEffect, useState } from "react";
import { View, Text, type LayoutChangeEvent, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

// Pixels/second the text scrolls at once it overflows — kept constant so a
// longer message doesn't feel like it's racing past faster than a short one.
const SPEED_PX_PER_SEC = 60;
const GAP_PX = 48;

interface MarqueeTextProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

// Renders `text` centered on one line unless it's too wide for its
// container — then it switches to a continuously scrolling loop instead of
// getting cut off, so the full message stays readable.
export function MarqueeText({ text, textStyle, containerStyle }: MarqueeTextProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);

  const overflowing =
    textWidth > 0 && containerWidth > 0 && textWidth > containerWidth;

  useEffect(() => {
    if (!overflowing) return;
    translateX.value = 0;
    translateX.value = withRepeat(
      withTiming(-(textWidth + GAP_PX), {
        duration: ((textWidth + GAP_PX) / SPEED_PX_PER_SEC) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [overflowing, textWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={containerStyle}
      onLayout={(e: LayoutChangeEvent) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Off-screen measurer — reports the text's true, unconstrained width
          so overflow can be detected before deciding how to render it. */}
      <Text
        style={[textStyle, { position: "absolute", opacity: 0 }]}
        onLayout={(e: LayoutChangeEvent) => setTextWidth(e.nativeEvent.layout.width)}
      >
        {text}
      </Text>

      {overflowing ? (
        <Animated.View style={[{ flexDirection: "row" }, animatedStyle]}>
          <Text style={[textStyle, { paddingRight: GAP_PX }]} numberOfLines={1}>
            {text}
          </Text>
          <Text style={[textStyle, { paddingRight: GAP_PX }]} numberOfLines={1} aria-hidden>
            {text}
          </Text>
        </Animated.View>
      ) : (
        <Text style={[textStyle, { textAlign: "center" }]} numberOfLines={1}>
          {text}
        </Text>
      )}
    </View>
  );
}
