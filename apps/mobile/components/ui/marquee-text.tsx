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

// Rounds and ignores sub-pixel differences before updating state — RN's
// layout engine can report a slightly different float for the same visual
// size across passes. Without this, onLayout -> setState -> re-render ->
// onLayout with a "new" (but visually identical) value can loop forever.
function setIfChanged(setter: (n: number) => void, current: number, next: number) {
  const rounded = Math.round(next);
  if (Math.abs(rounded - current) >= 1) setter(rounded);
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
      onLayout={(e: LayoutChangeEvent) =>
        setIfChanged(setContainerWidth, containerWidth, e.nativeEvent.layout.width)
      }
    >
      {/* Off-screen measurer — reports the text's true, single-line width so
          overflow can be detected before deciding how to render it. Despite
          having no width set, an absolutely-positioned Text can still get
          wrapped against the parent's available width (Yoga still treats it
          as a layout candidate for that), silently reporting a WRAPPED
          block's width back — which is always <= the container width,
          making `overflowing` always false. flexWrap: "nowrap" on the
          wrapping View forces the Text to lay out (and overflow) at its
          true natural width instead. */}
      <View style={{ position: "absolute", opacity: 0, flexDirection: "row", flexWrap: "nowrap" }}>
        <Text
          style={textStyle}
          onLayout={(e: LayoutChangeEvent) =>
            setIfChanged(setTextWidth, textWidth, e.nativeEvent.layout.width)
          }
        >
          {text}
        </Text>
      </View>

      {overflowing ? (
        <Animated.View style={[{ flexDirection: "row" }, animatedStyle]}>
          <Text style={[textStyle, { paddingRight: GAP_PX }]} numberOfLines={1}>
            {text}
          </Text>
          <Text
            style={[textStyle, { paddingRight: GAP_PX }]}
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
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
