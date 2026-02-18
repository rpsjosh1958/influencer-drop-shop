import { Pressable, View } from "react-native";
import { MotiView, MotiImage } from "moti";
import { P, H2 } from "@/components/ui/text";
import { useStore } from "@/context/store-context";

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
  options?: { id: string; name: string; values: string[] }[];
  category?: string;
  storeId?: string;
};

interface ProductCardProps {
  product: Product;
  index: number;
  onPress: (product: Product) => void;
}

export function ProductCard({ product, index, onPress }: ProductCardProps) {
  const { store } = useStore();
  const primaryColor = store?.theme?.primaryColor || "black";

  // Logic from Web: images -> imageUrl -> fallback
  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.imageUrl || ""];
  const imageSource = { uri: images[0] };

  // Stock logic
  const stock = product.stock ?? 0;
  const hasVariantStock =
    product.hasVariants && product.variants?.some((v) => v.stock > 0);
  const isSoldOut = stock <= 0 && !hasVariantStock;
  // Display stock is total (if > 0) or generic
  const displayStock = stock > 0 ? stock : hasVariantStock ? "Available" : 0;

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "timing", duration: 500, delay: index * 100 }}
      className="flex-1"
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
              !isSoldOut ? "bg-white/90" : "bg-red-500/90"
            }`}
          >
            <P
              className={`text-[10px] font-bold uppercase tracking-wider ${
                !isSoldOut ? "text-black" : "text-white"
              }`}
            >
              {!isSoldOut
                ? typeof displayStock === "number"
                  ? `${displayStock} Left`
                  : "Available"
                : "Sold Out"}
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
              style={{ color: primaryColor }}
            >
              {product.name}
            </H2>
            <P className="font-medium" style={{ color: primaryColor }}>
              GHS {product.price.toFixed(2)}
            </P>
          </View>

          <View className="flex-row items-center justify-between">
            <P
              className="text-zinc-500 text-xs line-clamp-1 flex-1 mr-2"
              numberOfLines={1}
            >
              {product.description || ""}
            </P>
          </View>
        </View>
      </Pressable>
    </MotiView>
  );
}
