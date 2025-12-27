"use client";

import { useState, useEffect } from "react";
import { Product, ProductVariant } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, BadgeCheck } from "lucide-react";
import { useCart } from "./cart-provider";
import { useStore } from "./store-provider";

interface ProductDetailsModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailsModal({
  product,
  isOpen,
  onClose,
}: ProductDetailsModalProps) {
  const { addToCart } = useCart();
  const { store } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Dynamic Selections
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );

  // Reset state when product opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      setSelections({});
      setSelectedVariant(null);
    }
  }, [isOpen, product]);

  // Find matching variant
  useEffect(() => {
    if (!product || !product.hasVariants || !product.variants) return;

    // Check if all options are selected
    const requiredOptions = product.options || [];
    const isComplete = requiredOptions.every((opt) => selections[opt.name]);

    if (isComplete) {
      const match = product.variants.find((v) => {
        // Match against v.options map
        // Note: Legacy variants might rely on 'color'/'size' fields if 'options' map is empty
        if (!v.options) {
          // Fallback for legacy (unlikely with new form, but good for safety)
          // Construct mock options from v.color/v.size
          const mock: Record<string, string> = {
            ...(v.color && { Color: v.color }),
            ...(v.size && { Size: v.size }),
          };
          return Object.entries(selections).every(
            ([k, val]) => mock[k] === val
          );
        }
        return Object.entries(selections).every(
          ([key, val]) => v.options[key] === val
        );
      });
      setSelectedVariant(match || null);
    } else {
      setSelectedVariant(null);
    }
  }, [selections, product]);

  if (!product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [product.imageUrl];

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    if (product.hasVariants && !selectedVariant) {
      return;
    }
    // Pass the variant with its specific price/id
    addToCart(product, selectedVariant || undefined);
    onClose();
  };

  const handleOptionSelect = (optionName: string, value: string) => {
    setSelections((prev) => ({ ...prev, [optionName]: value }));
  };

  // Helper: check if a value should be disabled (no stock in ANY combo?)
  // Strict: Disable if selecting this value creates a dead end based on CURRENT other selections.
  const isValueAvailable = (optionName: string, value: string) => {
    if (!product.variants) return false;

    // Temporary selections with this new value
    const nextSelections = { ...selections, [optionName]: value };

    // Does ANY variant match this subset of selections with stock > 0?
    return product.variants.some((v) => {
      if (v.stock <= 0) return false;

      // Legacy/New normalization logic
      const vOptions = v.options || {
        ...(v.color && { Color: v.color }),
        ...(v.size && { Size: v.size }),
      };

      // Check if variant matches all specific keys in nextSelections
      return Object.entries(nextSelections).every(
        ([k, val]) => vOptions[k] === val
      );
    });
  };

  // Calculate price to show (variant price might override)
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = currentStock <= 0;

  // Normalized Options List (Legacy Support)
  const displayOptions = product.options || [];

  // Legacy Adapter: If no options but variants exist, infer structure (Color/Size)
  // Only if product.options is missing/empty
  if (product.hasVariants && displayOptions.length === 0 && product.variants) {
    const colors = Array.from(
      new Set(product.variants.map((v) => v.color).filter(Boolean))
    ) as string[];
    const sizes = Array.from(
      new Set(product.variants.map((v) => v.size).filter(Boolean))
    ) as string[];

    if (colors.length)
      displayOptions.push({ id: "color", name: "Color", values: colors });
    if (sizes.length)
      displayOptions.push({ id: "size", name: "Size", values: sizes });
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-black w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]"
            >
              {/* Image Gallery (Mobile: Top, Desktop: Left) */}
              <div className="relative w-full md:w-1/2 bg-zinc-100 aspect-square md:aspect-auto">
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={handleNextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>

                    {/* Dots */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                      {images.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImageIndex
                              ? "bg-black"
                              : "bg-black/20"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                <button
                  onClick={onClose}
                  className="absolute top-4 left-4 md:hidden bg-black/50 text-white p-2 rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Product Info (Mobile: Bottom, Desktop: Right) */}
              <div className="flex-1 p-6 md:p-10 flex flex-col overflow-y-auto">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                        SOLD BY {store?.name || "DROP."}
                      </p>
                      {store?.isVerified && (
                        <BadgeCheck
                          size={14}
                          className="text-blue-500 fill-blue-500 text-white"
                        />
                      )}
                    </div>
                    <h2 className="text-3xl font-black uppercase tracking-tight">
                      {product.name}
                    </h2>
                    <p className="text-xl font-medium text-zinc-500 mt-1">
                      GHS {currentPrice.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="hidden md:block p-2 hover:bg-zinc-100 rounded-full"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="mt-8 space-y-6 flex-1">
                  {/* Description */}
                  <p className="text-zinc-600 leading-relaxed">
                    {product.description}
                  </p>

                  {/* Dynamic Options */}
                  {product.hasVariants && (
                    <div className="space-y-6">
                      {displayOptions.map((option) => (
                        <div key={option.id || option.name}>
                          <label className="text-xs font-bold uppercase text-zinc-400 mb-3 block">
                            {option.name}: {selections[option.name]}
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {option.values.map((value) => {
                              const isSelected =
                                selections[option.name] === value;
                              // Special render for "Color"
                              const isColor =
                                option.name.toLowerCase() === "color" ||
                                option.name.toLowerCase() === "colour";

                              // Find exact color code if possible for Color
                              let colorCode = null;
                              if (isColor && product.variants) {
                                const v = product.variants.find(
                                  (v) =>
                                    v.options?.[option.name] === value ||
                                    v.color === value
                                );
                                if (v?.colorCode) colorCode = v.colorCode;
                              }

                              // Check availability (stock)
                              const isAvailable = isValueAvailable(
                                option.name,
                                value
                              );

                              if (isColor) {
                                return (
                                  <button
                                    key={value}
                                    onClick={() =>
                                      handleOptionSelect(option.name, value)
                                    }
                                    className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isSelected
                                        ? "border-black scale-110 ring-2 ring-black ring-offset-2"
                                        : "border-zinc-200 hover:border-zinc-300"
                                    } ${
                                      !isAvailable && !isSelected
                                        ? "opacity-30 cursor-not-allowed"
                                        : ""
                                    }`}
                                    title={value}
                                    disabled={!isAvailable && !isSelected}
                                  >
                                    {colorCode ? (
                                      <div
                                        className="w-8 h-8 rounded-full"
                                        style={{ background: colorCode }}
                                      />
                                    ) : (
                                      <span className="text-[10px] font-bold">
                                        {value.substring(0, 1)}
                                      </span>
                                    )}
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                                        <Check
                                          size={14}
                                          className="text-white drop-shadow-md"
                                        />
                                      </div>
                                    )}
                                  </button>
                                );
                              }

                              return (
                                <button
                                  key={value}
                                  onClick={() =>
                                    handleOptionSelect(option.name, value)
                                  }
                                  disabled={!isAvailable && !isSelected}
                                  className={`min-w-[3rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                    isSelected
                                      ? "border-black bg-black text-white"
                                      : !isAvailable
                                      ? "border-zinc-100 text-zinc-300 cursor-not-allowed line-through"
                                      : "border-zinc-200 text-zinc-600 hover:border-black"
                                  }`}
                                >
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Bar */}
                <div className="mt-8 pt-6 border-t border-zinc-100">
                  <button
                    onClick={handleAddToCart}
                    disabled={
                      isOutOfStock || (product.hasVariants && !selectedVariant)
                    }
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-lg shadow-xl transition-all active:scale-95 ${
                      isOutOfStock
                        ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                        : product.hasVariants && !selectedVariant
                        ? "bg-zinc-100 text-zinc-400"
                        : "bg-black text-white hover:bg-zinc-900"
                    }`}
                  >
                    {isOutOfStock
                      ? "Sold Out"
                      : product.hasVariants && !selectedVariant
                      ? "Select Options"
                      : `Add to Cart — GHS ${currentPrice.toFixed(2)}`}
                  </button>
                  {currentStock > 0 && currentStock < 5 && (
                    <p className="text-center text-xs text-red-500 font-bold mt-3 animate-pulse">
                      Only {currentStock} left in stock!
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
