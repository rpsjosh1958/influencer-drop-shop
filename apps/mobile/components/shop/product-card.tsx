import { useEffect, useState } from "react";
import { Animated, Image, Pressable, View } from "react-native";
import { P, H2 } from "@/components/ui/text";
import { useStore } from "@/context/store-context";
import { formatCurrency } from "@/lib/format";
import type { ProductVariant } from "@/types";

export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  imageUrl?: string; // Legacy support
  description?: string;
  stock?: number;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  options?: { id: string; name: string; values: string[] }[];
  category?: string;
  storeId?: string;
  // Some card lists (search results) mix in service items alongside
  // products — real field, see global-search.tsx's "Service Tag" check.
  type?: string;
};

interface ProductCardProps {
  product: Product;
  index: number;
  onPress: (product: Product) => void;
}

export function ProductCard({ product, index, onPress }: ProductCardProps) {
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
    <Animated.View style={{ opacity }}>
      <Pressable onPress={() => onPress(product)} className="active:opacity-95">
        <View className="aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-3 relative shadow-sm">
          <Image
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

        <View className="px-1 space-y-1 mt-1">
          <H2
            className="text-base font-black leading-tight"
            numberOfLines={1}
            style={{ color: primaryColor }}
          >
            {product.name}
          </H2>
          
          <P className="font-bold text-sm" style={{ color: primaryColor }}>
            {formatCurrency(product.price)}
          </P>

          <P
            className="text-zinc-500 text-xs line-clamp-1"
            numberOfLines={1}
          >
            {product.description || ""}
          </P>
        </View>
      </Pressable>
    </Animated.View>
  );
}
