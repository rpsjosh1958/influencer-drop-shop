import { useEffect, useState } from "react";
import { View } from "react-native";
import { MotiView, MotiText } from "moti";
import { H1 } from "./ui/text";

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const [shouldExit, setShouldExit] = useState(false);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setShouldExit(true); // Trigger exit animation
    }, 2500); // Slightly longer to ensure app is ready

    return () => clearTimeout(timer);
  }, []);

  return (
    <MotiView
        className="flex-1 bg-white items-center justify-center"
        animate={{ opacity: shouldExit ? 0 : 1 }}
        transition={{ type: 'timing', duration: 800 }}
        onDidAnimate={() => {
            if (shouldExit) {
                onFinish();
            }
        }}
    >
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 1000 }}
        className="items-center"
      >
        <View className="h-24 w-24 bg-black rounded-full mb-6 items-center justify-center">
          <H1 className="text-white text-4xl">D.</H1>
        </View>
        <MotiText
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 500, type: "timing", duration: 800 }}
        >
          <H1>DROP.</H1>
        </MotiText>
      </MotiView>
    </MotiView>
  );
}
