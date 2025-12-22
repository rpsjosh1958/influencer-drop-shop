import { Pressable, View } from "react-native";
import { MotiView, MotiImage } from "moti";
import { P, H2 } from "@/components/ui/text";

export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  imageUrl?: string; // Legacy support
  description?: string;
  stock?: number;
  hasVariants?: boolean;
  variants?: any[];
  category?: string;
};

interface ProductCardProps {
  product: Product;
  index: number;
  onPress: (product: Product) => void;
}

export function ProductCard({ product, index, onPress }: ProductCardProps) {
  // Logic from Web: images -> imageUrl -> fallback
  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.imageUrl || "https://via.placeholder.com/300"];
  const imageSource = { uri: images[0] };

  // Stock logic
  const stock = product.stock ?? 0;
  const isSoldOut = stock <= 0;
  const isLowStock = stock > 0 && stock < 5;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 500, delay: index * 100 }}
      className="flex-1 m-2 mb-6"
    >
      <Pressable onPress={() => onPress(product)} className="active:opacity-95">
        <View className="aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-3 relative shadow-sm">
          <MotiImage
            source={imageSource}
            className={`w-full h-full ${
              isSoldOut ? "opacity-70 grayscale" : ""
            }`}
            style={{ resizeMode: "cover" }}
          />

          {/* Stock Badge (Top Right like Web) */}
          <View
            className={`absolute top-4 right-4 px-3 py-1 rounded-full ${
              stock > 0 ? "bg-white/90" : "bg-red-500/90"
            }`}
          >
            <P
              className={`text-[10px] font-bold uppercase tracking-wider ${
                stock > 0 ? "text-black" : "text-white"
              }`}
            >
              {stock > 0 ? `${stock} Left` : "Sold Out"}
            </P>
          </View>

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <View className="absolute inset-0 bg-black/10 items-center justify-center" />
          )}
        </View>

        <View className="px-1 space-y-1">
          <View className="flex-row justify-between items-start">
            <H2
              className="text-base font-bold leading-tight flex-1 mr-2"
              numberOfLines={1}
            >
              {product.name}
            </H2>
            <P className="font-medium text-zinc-900">
              GHS{product.price.toFixed(2)}
            </P>
          </View>

          <View className="flex-row items-center justify-between">
            <P
              className="text-zinc-500 text-xs line-clamp-1 flex-1 mr-2"
              numberOfLines={1}
            >
              {product.description || "Limited edition drop."}
            </P>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}
