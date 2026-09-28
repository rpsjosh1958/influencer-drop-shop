import { useEffect, useState } from "react";
import { Animated, Image, Pressable, View } from "react-native";
import { P, H2 } from "@/components/ui/text";
import { useStore } from "@/context/store-context";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "@/lib/format";
import type { FirestoreTimestamp } from "@/types";

export type ServiceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  imageUrl?: string;
  duration: number; // Duration in minutes
  bufferTime?: number;
  category?: string;
  storeId: string;
  isActive: boolean;
  createdAt: FirestoreTimestamp;
};

interface ServiceCardProps {
  service: ServiceItem;
  index: number;
  onPress: (service: ServiceItem) => void;
}

export function ServiceCard({ service, index, onPress }: ServiceCardProps) {
  // Plain Animated fade rather than Moti: Moti 0.30 predates Reanimated 4,
  // and its from-scale (0.95) entrance could leave cards rendered at 95% of
  // their grid cell, pinned left — uneven gaps across the grid. No scale
  // here, so a card always ends at exactly its layout size.
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 500,
      // Capped so cards far down a long list don't wait seconds to appear.
      delay: Math.min(index, 8) * 100,
      useNativeDriver: true,
    }).start();
  }, [opacity, index]);

  const { store } = useStore();
  const primaryColor = store?.theme?.primaryColor || "black";
  const isCompact =
    store?.theme?.cardSize === "medium" || store?.theme?.cardSize === "small";

  // Image logic
  const images =
    service.images && service.images.length > 0
      ? service.images
      : [service.imageUrl || ""];
  const imageSource = images[0] ? { uri: images[0] } : null;

  return (
    <Animated.View style={{ opacity }}>
      <Pressable onPress={() => onPress(service)} className="active:opacity-95">
        <View className="aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-3 relative shadow-sm">
          {imageSource ? (
            <Image
              source={imageSource}
              className="w-full h-full"
              style={{ resizeMode: "cover" }}
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-zinc-100">
              <Ionicons name="briefcase-outline" size={48} color="#ccc" />
            </View>
          )}

          {/* Service Badge (Top Right) - Hide on compact */}
          {!isCompact && (
            <View className="absolute top-4 right-4 px-3 py-1 rounded-full bg-blue-500/90">
              <P className="text-[10px] font-bold uppercase tracking-wider text-white">
                Service
              </P>
            </View>
          )}

          {/* Duration Badge (Top Left) */}
          <View className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/90 flex-row items-center">
            <Ionicons name="time-outline" size={12} color="black" />
            <P className="text-[10px] font-bold ml-1 text-black">
              {service.duration} min
            </P>
          </View>

          {/* Book Now Button */}
          <View className="absolute bottom-4 left-4 right-4">
            <View className="bg-white/90 rounded-xl py-3 items-center">
              <P className="text-xs font-bold uppercase tracking-wide text-black">
                {isCompact
                  ? formatCurrency(service.price)
                  : `Book Now — ${formatCurrency(service.price)}`}
              </P>
            </View>
          </View>
        </View>

        <View className="px-1 space-y-1">
          <View className="flex-row justify-between items-start">
            <H2
              className="text-base font-bold leading-tight flex-1 mr-2"
              numberOfLines={1}
              style={{ color: primaryColor }}
            >
              {service.name}
            </H2>
          </View>

          <View className="flex-row items-center justify-between">
            <P
              className="text-zinc-500 text-xs line-clamp-2 flex-1"
              numberOfLines={2}
            >
              {service.description || ""}
            </P>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
