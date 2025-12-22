import { View } from "react-native";
import { MotiView } from "moti";
import { H1, P } from "@/components/ui/text";
import { Lock } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";

export function ShopClosed() {
  return (
    <View className="flex-1 bg-black items-center justify-center p-6">
      <StatusBar style="light" />
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "timing", duration: 1000 }}
        className="items-center"
      >
        <MotiView
          from={{ translateY: -20 }}
          animate={{ translateY: 0 }}
          transition={{
            type: "timing",
            duration: 2000,
            loop: true,
          }}
          className="mb-8"
        >
          <Lock size={64} color="#52525b" />
        </MotiView>

        <H1 className="text-white text-5xl font-black text-center tracking-tighter mb-4 leading-none">
          DROP CLOSED
        </H1>

        <P className="text-zinc-500 text-center text-lg max-w-xs leading-relaxed">
          The store is currently offline.
Follow our socials for the next drop time.
        </P>

       
      </MotiView>
    </View>
  );
}
