import { useEffect, useState } from "react";
import { View } from "react-native";
import { MotiView, MotiText } from "moti";
import { H1 } from "./ui/text";

interface AnimatedSplashProps {
  onFinish: () => void;
}

export function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simulate initial loading (fonts, assets, auth check)
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2000); // Minimum 2s splash

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 bg-white items-center justify-center">
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 1000 }}
        className="items-center"
      >
        <View className="h-24 w-24 bg-black rounded-full mb-6 items-center justify-center">
          {/* Placeholder for Logo */}
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

      {/* Exit Animation Trigger */}
      {isReady && (
        <MotiView
          from={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 500 }}
          onDidAnimate={onFinish}
          className="absolute inset-0 bg-white pointer-events-none"
        />
      )}
    </View>
  );
}
