import {
  Modal,
  View,
  ScrollView,
  Dimensions,
  Pressable,
  FlatList,
} from "react-native";
import { MotiView, MotiImage } from "moti";
import { H1, P } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { X, Check } from "lucide-react-native";
import { Product } from "./product-card";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface ProductDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  product: Product | null;
  onAddToCart: (product: Product, variant?: any) => void;
}

export function ProductDetailsModal({
  isVisible,
  onClose,
  product,
  onAddToCart,
}: ProductDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Logic from Web
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  // Reset on open
  useEffect(() => {
    if (isVisible) {
      setCurrentImageIndex(0);
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedVariant(null);
    }
  }, [isVisible, product]);

  // Derived State
  const variants = useMemo(() => product?.variants || [], [product]);
  const uniqueColors = useMemo(
    () =>
      Array.from(new Set(variants.map((v: any) => v.color).filter(Boolean))),
    [variants]
  );
  const uniqueSizes = useMemo(
    () => Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))),
    [variants]
  );

  // Variant Matching
  useEffect(() => {
    if (!product || !product.hasVariants) return;

    let match = null;
    if (selectedColor && selectedSize) {
      match = variants.find(
        (v: any) => v.color === selectedColor && v.size === selectedSize
      );
    } else if (selectedColor && uniqueSizes.length === 0) {
      match = variants.find((v: any) => v.color === selectedColor);
    } else if (selectedSize && uniqueColors.length === 0) {
      match = variants.find((v: any) => v.size === selectedSize);
    }
    setSelectedVariant(match || null);
  }, [selectedColor, selectedSize, product, variants]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index || 0);
    }
  }).current;

  // Stable config
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  if (!product) return null;

  // SAFE IMAGE ACCESS
  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.imageUrl || "https://via.placeholder.com/500"];

  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant
    ? selectedVariant.stock
    : product.stock ?? 0;
  const isOutOfStock = currentStock <= 0;

  const handleAddToCart = () => {
    if (product.hasVariants && !selectedVariant) return;
    onAddToCart(product, selectedVariant);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Close Button */}
          <Pressable
            onPress={onClose}
            className="absolute top-4 right-4 z-50 bg-white/80 p-2 rounded-full backdrop-blur-md"
            style={{ marginTop: 10 }}
          >
            <X color="black" size={24} />
          </Pressable>

          {/* Image Slider */}
          <View className="h-[500px] w-full bg-zinc-100 relative">
            <FlatList
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              renderItem={({ item }) => (
                <View style={{ width, height: 500 }}>
                  <MotiImage
                    source={{ uri: item }}
                    className="w-full h-full"
                    style={{ resizeMode: "cover" }}
                  />
                </View>
              )}
              keyExtractor={(_, i) => i.toString()}
            />

            {/* Pagination Dots */}
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
              {images.map((_, i) => (
                <MotiView
                  key={i}
                  animate={{
                    width: i === currentImageIndex ? 20 : 6,
                    opacity: i === currentImageIndex ? 1 : 0.5,
                  }}
                  className="h-1.5 rounded-full bg-black"
                />
              ))}
            </View>
          </View>

          <View className="p-6 space-y-6">
            <View>
              <H1 className="text-3xl font-black uppercase tracking-tighter">
                {product.name}
              </H1>
              <P className="text-2xl font-medium text-zinc-500 mt-2">
                ${currentPrice.toFixed(2)}
              </P>
            </View>

            {/* Description */}
            <View>
              <P className="text-zinc-600 leading-relaxed text-base">
                {product.description ||
                  "Limited edition drop. 100% Cotton. Premium heavyweight fabric. Made in Portugal."}
              </P>
            </View>

            {/* Variants */}
            {product.hasVariants && (
              <View className="space-y-6">
                {/* Colors */}
                {uniqueColors.length > 0 && (
                  <View>
                    <P className="text-xs font-bold uppercase text-zinc-400 mb-3">
                      Color: {selectedColor}
                    </P>
                    <View className="flex-row gap-3 flex-wrap">
                      {uniqueColors.map((color: any) => (
                        <Pressable
                          key={color}
                          onPress={() => setSelectedColor(color)}
                          className={`h-10 w-10 rounded-full border-2 items-center justify-center ${
                            selectedColor === color
                              ? "border-black"
                              : "border-zinc-200"
                          }`}
                        >
                          <View
                            className="h-8 w-8 rounded-full bg-gray-200"
                            style={{ backgroundColor: color.toLowerCase() }}
                          />
                          {selectedColor === color && (
                            <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-full">
                              <Check size={14} color="white" />
                            </View>
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Sizes */}
                {uniqueSizes.length > 0 && (
                  <View>
                    <P className="text-xs font-bold uppercase text-zinc-400 mb-3">
                      Size: {selectedSize}
                    </P>
                    <View className="flex-row gap-3 flex-wrap">
                      {uniqueSizes.map((size: any) => {
                        // Check availability logic
                        let disabled = false;
                        if (selectedColor) {
                          const exists = variants.find(
                            (v: any) =>
                              v.color === selectedColor &&
                              v.size === size &&
                              v.stock > 0
                          );
                          if (!exists) disabled = true;
                        }

                        return (
                          <Pressable
                            key={size}
                            onPress={() => !disabled && setSelectedSize(size)}
                            className={`min-w-[48px] px-3 py-2 rounded-xl border border-zinc-200 items-center justify-center ${
                              selectedSize === size
                                ? "bg-black border-black"
                                : disabled
                                ? "bg-zinc-50 opacity-50"
                                : "bg-white"
                            }`}
                          >
                            <P
                              className={`${
                                selectedSize === size
                                  ? "text-white font-bold"
                                  : disabled
                                  ? "text-zinc-300 line-through"
                                  : "text-black"
                              }`}
                            >
                              {size}
                            </P>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Add to Cart */}
        <MotiView
          from={{ translateY: 100 }}
          animate={{ translateY: 0 }}
          className="absolute bottom-0 left-0 right-0 bg-white/90 border-t border-zinc-100 backdrop-blur-xl px-6 pt-4"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <Button
            title={
              isOutOfStock
                ? "SOLD OUT"
                : product.hasVariants && !selectedVariant
                ? "SELECT OPTIONS"
                : `ADD TO BAG • $${currentPrice.toFixed(2)}`
            }
            disabled={
              isOutOfStock || (!!product.hasVariants && !selectedVariant)
            }
            onPress={handleAddToCart}
            variant={
              isOutOfStock
                ? "outline"
                : product.hasVariants && !selectedVariant
                ? "outline"
                : "default"
            }
          />
          {currentStock > 0 && currentStock < 5 && (
            <P className="text-center text-red-500 font-bold text-xs mt-2">
              Only {currentStock} left!
            </P>
          )}
        </MotiView>
      </View>
    </Modal>
  );
}
