import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

// The full intro plays for at least this long, whatever loads first.
const MIN_DURATION_MS = 3500;
// If `ready` never arrives (e.g. auth hangs offline), leave anyway.
const MAX_WAIT_MS = 10000;
const EXIT_DURATION_MS = 800;

interface AnimatedSplashProps {
  // True once the app has what it needs underneath (auth resolved). The
  // splash only starts leaving when this is true AND the minimum time has
  // passed, so startup work never cuts it short.
  ready: boolean;
  onFinish: () => void;
}

// Plain Animated rather than Moti: Moti 0.30 predates Reanimated 4, and its
// onDidAnimate (which this used to rely on to finish) isn't dependable here.
export function AnimatedSplash({ ready, onFinish }: AnimatedSplashProps) {
  const [anim] = useState(() => ({
    screenOpacity: new Animated.Value(1),
    logoOpacity: new Animated.Value(0),
    logoScale: new Animated.Value(0.8),
    textOpacity: new Animated.Value(0),
    textTranslateY: new Animated.Value(20),
  }));
  const [minElapsed, setMinElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const exitStarted = useRef(false);

  // Intro + timers.
  useEffect(() => {
    Animated.parallel([
      Animated.timing(anim.logoOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(anim.logoScale, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(anim.textOpacity, { toValue: 1, duration: 800, delay: 500, useNativeDriver: true }),
      Animated.timing(anim.textTranslateY, { toValue: 0, duration: 800, delay: 500, useNativeDriver: true }),
    ]).start();

    const minTimer = setTimeout(() => setMinElapsed(true), MIN_DURATION_MS);
    const maxTimer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, [anim]);

  // Exit once the intro has had its time and the app is ready.
  useEffect(() => {
    if (exitStarted.current || !minElapsed || !(ready || timedOut)) return;
    exitStarted.current = true;
    Animated.timing(anim.screenOpacity, {
      toValue: 0,
      duration: EXIT_DURATION_MS,
      useNativeDriver: true,
    }).start(() => onFinish());
  }, [minElapsed, ready, timedOut, anim, onFinish]);

  return (
    <Animated.View
      style={{ flex: 1, opacity: anim.screenOpacity }}
      className="bg-white items-center justify-center"
    >
      <Animated.View
        style={{ opacity: anim.logoOpacity, transform: [{ scale: anim.logoScale }] }}
        className="items-center"
      >
        <View className="h-24 w-24 bg-black rounded-full mb-6 items-center justify-center">
          <Text className="text-white text-4xl font-black tracking-tighter">
            D.
          </Text>
        </View>
        <Animated.View
          style={{
            opacity: anim.textOpacity,
            transform: [{ translateY: anim.textTranslateY }],
          }}
        >
          <Text className="text-5xl font-black tracking-tighter text-black">
            THE DROP.
          </Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}
