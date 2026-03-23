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
import { X, Check, BadgeCheck } from "lucide-react-native";
import { Product } from "./product-card";
import { useState, useEffect, useMemo, useRef } from "react";
import { formatCurrency } from "@/lib/format";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/context/store-context";

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
  const { store } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Dynamic Selections
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);

  // Reset on open
  useEffect(() => {
    if (isVisible) {
      setCurrentImageIndex(0);
      setSelections({});
      setSelectedVariant(null);
    }
  }, [isVisible, product]);

  // Derived Options (Legacy Support)
  const displayOptions = useMemo((): {
    id?: string;
    name: string;
    values: string[];
  }[] => {
    if (!product) return [];
    if (product.options && product.options.length > 0) return product.options;

    // Fallback: Infer from variants (Legacy)
    if (product.hasVariants && product.variants) {
      const options: { id: string; name: string; values: string[] }[] = [];
      const colors = Array.from(
        new Set(product.variants.map((v: any) => v.color).filter(Boolean))
      ) as string[];
      const sizes = Array.from(
        new Set(product.variants.map((v: any) => v.size).filter(Boolean))
      ) as string[];

      if (colors.length)
        options.push({ id: "color", name: "Color", values: colors });
      if (sizes.length)
        options.push({ id: "size", name: "Size", values: sizes });
      return options;
    }
    return [];
  }, [product]);

  // Variant Matching
  useEffect(() => {
    if (!product || !product.hasVariants || !product.variants) return;

    // Check completeness
    const requiredOptions = displayOptions;
    const isComplete = requiredOptions.every((opt) => selections[opt.name]);

    if (isComplete) {
      const match = product.variants.find((v: any) => {
        // Modern check
        if (v.options) {
          return Object.entries(selections).every(
            ([key, val]) => v.options[key] === val
          );
        }
        // Legacy check
        const mock: Record<string, string> = {
          ...(v.color && { Color: v.color }),
          ...(v.size && { Size: v.size }),
        };
        return Object.entries(selections).every(([k, val]) => mock[k] === val);
      });
      setSelectedVariant(match || null);
    } else {
      setSelectedVariant(null);
    }
  }, [selections, product, displayOptions]);

  // Helper: Hierarchical Availability Check
  const isVariantAvailable = (
    optionName: string,
    value: string,
    currentSelections: Record<string, string>
  ) => {
    if (!product?.variants) return false;
    
    const optionIndex = displayOptions.findIndex((opt) => opt.name === optionName);
    if (optionIndex === -1) return false;

    // Only strictly enforce matching options that appear BEFORE this one
    const relevantSelections: Record<string, string> = {};
    for (let i = 0; i < optionIndex; i++) {
        const prevName = displayOptions[i].name;
        if (currentSelections[prevName]) {
            relevantSelections[prevName] = currentSelections[prevName];
        }
    }

    const targetMatcher = { ...relevantSelections, [optionName]: value };

    return product.variants.some((v: any) => {
      if (v.stock <= 0) return false;
      const vOptions = v.options || {
        ...(v.color && { Color: v.color }),
        ...(v.size && { Size: v.size }),
      };
      return Object.entries(targetMatcher).every(([k, v]) => vOptions[k] === v);
    });
  };

  const handleOptionSelect = (name: string, value: string) => {
    const newSelections = { ...selections, [name]: value };
    
    // Check downstream options and clear if invalid
    const optionIndex = displayOptions.findIndex((opt) => opt.name === name);
    if (optionIndex !== -1) {
        for (let i = optionIndex + 1; i < displayOptions.length; i++) {
            const nextOption = displayOptions[i].name;
            const nextValue = newSelections[nextOption];
            if (nextValue) {
                // Check if this downstream selection is still valid
                const isStillValid = isVariantAvailable(nextOption, nextValue, newSelections);
                if (!isStillValid) {
                    delete newSelections[nextOption];
                }
            }
        }
    }
    setSelections(newSelections);
  };

  const isValueAvailable = (optionName: string, value: string) => {
     return isVariantAvailable(optionName, value, selections);
  };

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
              <View className="flex-row items-center gap-1 mb-2">
                <P className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  SOLD BY {store?.name || "DROP."}
                </P>
                {store?.isVerified && (
                  <BadgeCheck size={14} color="#3b82f6" fill="white" />
                )}
              </View>
              <H1 className="text-3xl font-black uppercase tracking-tighter">
                {product.name}
              </H1>
              <P className="text-2xl font-medium text-zinc-500 mt-2">
                {formatCurrency(currentPrice)}
              </P>
            </View>

            {/* Description */}
            <View>
              <P className="text-zinc-600 leading-relaxed text-base">
                {product.description || ""}
              </P>
            </View>

            {/* Dynamic Options */}
            {product.hasVariants && (
              <View className="space-y-6">
                {displayOptions.map((option) => (
                  <View key={option.name}>
                    <P className="text-xs font-bold uppercase text-zinc-400 mb-3">
                      {option.name}: {selections[option.name]}
                    </P>
                    <View className="flex-row gap-3 flex-wrap">
                      {option.values.map((value: string) => {
                        const isSelected = selections[option.name] === value;
                        const isAvailable = isValueAvailable(
                          option.name,
                          value
                        );

                        // Special Render for Color
                        const isColor =
                          option.name.toLowerCase() === "color" ||
                          option.name.toLowerCase() === "colour";

                        // Try to find hex code
                        let colorCode = null;
                        if (isColor && product.variants) {
                          const v = product.variants.find(
                            (v: any) =>
                              v.options?.[option.name] === value ||
                              v.color === value
                          );
                          if (v?.colorCode) colorCode = v.colorCode;
                          // Fallback to value if it's a valid color Code?
                          // Usually value is "Red", code is "#f00".
                        }

                        if (isColor) {
                          return (
                            <Pressable
                              key={value}
                              onPress={() =>
                                handleOptionSelect(option.name, value)
                              }
                              disabled={!isAvailable && !isSelected}
                              className={`h-10 w-10 rounded-full border-2 items-center justify-center ${
                                isSelected ? "border-black" : "border-zinc-200"
                              } ${
                                !isAvailable && !isSelected ? "opacity-30" : ""
                              }`}
                            >
                              {colorCode ? (
                                <View
                                  className="h-8 w-8 rounded-full border border-black/5"
                                  style={{ backgroundColor: colorCode }}
                                />
                              ) : (
                                <View className="h-8 w-8 rounded-full bg-gray-100 items-center justify-center">
                                  <P className="text-[10px] font-bold">
                                    {value.substring(0, 1)}
                                  </P>
                                </View>
                              )}

                              {isSelected && (
                                <View className="absolute inset-0 items-center justify-center bg-black/20 rounded-full">
                                  <Check size={14} color="white" />
                                </View>
                              )}
                            </Pressable>
                          );
                        }

                        return (
                          <Pressable
                            key={value}
                            onPress={() =>
                              !(!isAvailable && !isSelected) &&
                              handleOptionSelect(option.name, value)
                            }
                            className={`min-w-[48px] px-3 py-2 rounded-xl border items-center justify-center ${
                              isSelected
                                ? "bg-black border-black"
                                : !isAvailable
                                ? "bg-zinc-50 border-zinc-100 opacity-50"
                                : "bg-white border-zinc-200"
                            }`}
                          >
                            <P
                              className={`${
                                isSelected
                                  ? "text-white font-bold"
                                  : !isAvailable
                                  ? "text-zinc-300 line-through"
                                  : "text-black"
                              }`}
                            >
                              {value}
                            </P>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
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
                : `ADD TO BAG • ${formatCurrency(currentPrice)}`
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
