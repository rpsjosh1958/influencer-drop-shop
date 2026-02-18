import { Pressable, View } from "react-native";
import { MotiView, MotiImage } from "moti";
import { P, H2 } from "@/components/ui/text";
import { useStore } from "@/context/store-context";
import { Ionicons } from "@expo/vector-icons";

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
  createdAt: any;
};

interface ServiceCardProps {
  service: ServiceItem;
  index: number;
  onPress: (service: ServiceItem) => void;
}

export function ServiceCard({ service, index, onPress }: ServiceCardProps) {
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
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 500, delay: index * 100 }}
      className="flex-1"
    >
      <Pressable onPress={() => onPress(service)} className="active:opacity-95">
        <View className="aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-3 relative shadow-sm">
          {imageSource ? (
            <MotiImage
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
                  ? `GHS ${service.price}`
                  : `Book Now — GHS ${service.price}`}
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
    </MotiView>
  );
}
