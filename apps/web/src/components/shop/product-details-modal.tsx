"use client";

import { useState, useEffect } from "react";
import { Product, ProductVariant } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useCart } from "./cart-provider";

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    null
  );

  // Reset state when product opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      setSelectedColor(null);
      setSelectedSize(null);
      setSelectedVariant(null);
    }
  }, [isOpen, product]);

  // Determine available colors and sizes
  const variants = product?.variants || [];
  const uniqueColors = Array.from(
    new Set(variants.map((v) => v.color).filter(Boolean))
  ) as string[];
  const uniqueSizes = Array.from(
    new Set(variants.map((v) => v.size).filter(Boolean))
  ) as string[];

  // Update selected variant when choices change
  useEffect(() => {
    if (!product || !product.hasVariants) return;

    if (selectedColor && selectedSize) {
      const match = variants.find(
        (v) => v.color === selectedColor && v.size === selectedSize
      );
      setSelectedVariant(match || null);
    } else if (selectedColor && uniqueSizes.length === 0) {
      // Color only
      const match = variants.find((v) => v.color === selectedColor);
      setSelectedVariant(match || null);
    } else if (selectedSize && uniqueColors.length === 0) {
      // Size only
      const match = variants.find((v) => v.size === selectedSize);
      setSelectedVariant(match || null);
    }
  }, [
    selectedColor,
    selectedSize,
    product,
    variants,
    uniqueColors.length,
    uniqueSizes.length,
  ]);

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
      return; // Should be disabled anyway
    }

    addToCart(product, selectedVariant || undefined);
    onClose();
  };

  // Calculate price to show (variant price might override)
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant ? selectedVariant.stock : product.stock;
  const isOutOfStock = currentStock <= 0;

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

                  {/* Variants */}
                  {product.hasVariants && (
                    <div className="space-y-6">
                      {/* Colors */}
                      {uniqueColors.length > 0 && (
                        <div>
                          <label className="text-xs font-bold uppercase text-zinc-400 mb-3 block">
                            Color: {selectedColor}
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {uniqueColors.map((color) => {
                              // Find local variant info for this color to get hex if possible
                              const v = variants.find((v) => v.color === color);
                              const isSelected = selectedColor === color;
                              return (
                                <button
                                  key={color}
                                  onClick={() => setSelectedColor(color)}
                                  className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? "border-black scale-110 ring-2 ring-black ring-offset-2"
                                      : "border-zinc-200 hover:border-zinc-300"
                                  }`}
                                  title={color}
                                >
                                  {v?.colorCode ? (
                                    <div
                                      className="w-8 h-8 rounded-full"
                                      style={{ background: v.colorCode }}
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold">
                                      {color.substring(0, 1)}
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
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sizes */}
                      {uniqueSizes.length > 0 && (
                        <div>
                          <label className="text-xs font-bold uppercase text-zinc-400 mb-3 block">
                            Size: {selectedSize}
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {uniqueSizes.map((size) => {
                              const isSelected = selectedSize === size;

                              // Check if this size is available for the selected color (if color selected)
                              let isDisabled = false;
                              if (selectedColor) {
                                const exists = variants.some(
                                  (v) =>
                                    v.color === selectedColor &&
                                    v.size === size &&
                                    v.stock > 0
                                );
                                if (!exists) isDisabled = true;
                              }

                              return (
                                <button
                                  key={size}
                                  onClick={() =>
                                    !isDisabled && setSelectedSize(size)
                                  }
                                  disabled={isDisabled}
                                  className={`min-w-[3rem] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                                    isSelected
                                      ? "border-black bg-black text-white"
                                      : isDisabled
                                      ? "border-zinc-100 text-zinc-300 cursor-not-allowed line-through"
                                      : "border-zinc-200 text-zinc-600 hover:border-black"
                                  }`}
                                >
                                  {size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
