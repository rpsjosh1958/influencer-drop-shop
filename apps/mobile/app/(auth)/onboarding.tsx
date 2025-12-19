import { useState } from "react";
import { View, Dimensions, FlatList } from "react-native";
import { Stack, useRouter } from "expo-router";
import { MotiView, MotiImage } from "moti";
import { Button } from "@/components/ui/button";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "THE DROP.",
    description:
      "Exclusive, limited-time releases from your favorite creators. Don't lack.",
    image:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80",
  },
  {
    id: "2",
    title: "THE HYPE.",
    description: "Join the movement. Secure the bag before it's gone forever.",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80",
  },
  {
    id: "3",
    title: "THE SECURE.",
    description: "Fast checkout using Apple Pay & saved details. No fumbling.",
    image:
      "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?w=800&q=80",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  console.log("Onboarding: Rendering...");

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      // Logic to scroll would go here if using ref, but for simple MVP just routing at end
      // For now, let's just assume user swipes or clicks next
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      style={{ flex: 1, backgroundColor: "white" }}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View
            style={{ width }}
            className="flex-1 items-center justify-center p-8 space-y-8"
          >
            <MotiImage
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "timing", duration: 1000 }}
              source={{ uri: item.image }}
              className="w-full aspect-square rounded-3xl bg-zinc-100"
              style={{ resizeMode: "cover" }}
            />
            <View className="pt-8 space-y-4 text-center items-center">
              <H1 className="text-center">{item.title}</H1>
              <P className="text-center text-lg">{item.description}</P>
            </View>
          </View>
        )}
      />

      <View className="p-8 space-y-4">
        <View className="flex-row justify-center gap-2 mb-4">
          {SLIDES.map((_, idx) => (
            <MotiView
              key={idx}
              animate={{
                width: idx === currentIndex ? 24 : 8,
                opacity: idx === currentIndex ? 1 : 0.3,
              }}
              className="h-2 rounded-full bg-black"
            />
          ))}
        </View>

        <Button
          title={
            currentIndex === SLIDES.length - 1
              ? "GET STARTED"
              : "SWIPE TO CONTINUE"
          }
          onPress={() => router.replace("/(auth)/login")}
        />
      </View>
    </SafeAreaView>
  );
}
