import { View, ViewProps, DimensionValue } from "react-native";
import { MotiView } from "moti";

type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
} & ViewProps;

export function Skeleton({
  width,
  height,
  radius = 8,
  style,
  ...props
}: SkeletonProps) {
  return (
    <MotiView
      from={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{
        type: "timing",
        duration: 1000,
        loop: true,
      }}
      style={[
        { width, height, borderRadius: radius, backgroundColor: "#f4f4f5" },
        style,
      ]}
      {...props}
    />
  );
}
