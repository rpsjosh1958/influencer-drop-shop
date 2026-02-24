"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { Product } from "@/types";
import { ProductDetailsModal } from "./product-details-modal";

interface ProductCardProps {
  product: Product;
  index: number;
  addToCart: (product: Product) => void;
  initialOpen?: boolean;
}

export function ProductCard({
  product,
  index,
  addToCart,
  initialOpen = false,
}: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(initialOpen || false);

  // // Sync initialOpen prop to state
  // useEffect(() => {
  //   if (initialOpen) setIsModalOpen(true);
  // }, [initialOpen]);

  // Use images array if available, fallback to legacy imageUrl
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

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.hasVariants) {
      setIsModalOpen(true);
    } else {
      if (product.stock > 0) addToCart(product);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.1 }}
        className="group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="relative aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-2xl transition-all duration-500">
          {/* Loading Spinner */}
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-zinc-300" />
            </div>
          )}

          <Image
            src={images[currentImageIndex]}
            alt={product.name}
            fill
            priority={index < 2} // Eager load first 2 items
            className={`object-cover transition-all duration-700 ${
              isImageLoaded ? "opacity-100 grayscale-0" : "opacity-0 grayscale"
            }`}
            onLoad={() => setIsImageLoaded(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />

          {/* Gallery Arrows (Faint) */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/30 transition-all z-20"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/10 text-white opacity-0 group-hover:opacity-100 hover:bg-black/30 transition-all z-20"
              >
                <ChevronRight size={16} />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all ${
                      idx === currentImageIndex
                        ? "bg-white scale-125"
                        : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          <div
            className={`absolute top-4 right-4 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-10 ${
              product.stock > 0 ||
              (product.hasVariants &&
                product.variants?.some((v) => v.stock > 0))
                ? "bg-white/90 text-black"
                : "bg-red-500/90 text-white"
            }`}
          >
            {product.stock > 0
              ? `${product.stock} Left`
              : product.hasVariants &&
                  product.variants?.some((v) => v.stock > 0)
                ? "Available"
                : "Sold Out"}
          </div>

          {/* Quick Add / Select Options */}
          <div className="absolute inset-x-4 bottom-4 z-10">
            <button
              onClick={handleAction}
              disabled={product.stock <= 0 && !product.hasVariants} // If variants, technically stock might exist on some variants even if total is 0 (edge case, but handled)
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg backdrop-blur-md transition-transform active:scale-95 ${
                product.stock > 0 || product.hasVariants
                  ? "bg-white/90 text-black hover:bg-white"
                  : "bg-red-500/90 text-white cursor-not-allowed"
              }`}
            >
              {product.stock > 0 || product.hasVariants
                ? product.hasVariants
                  ? "Select Options"
                  : `Add to cart — GHS ${product.price}`
                : "Sold Out"}
            </button>
          </div>
        </div>

        <div className="space-y-1 px-2">
          <h3 className="text-lg font-bold tracking-tight">{product.name}</h3>
          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-sm line-clamp-1">
              {product.description}
            </p>
            <div className="flex items-center gap-1 text-xs font-bold bg-zinc-100 px-2 py-1 rounded-md text-black">
              <Star size={10} className="fill-black" />
              5.0
            </div>
          </div>
        </div>
      </motion.div>

      <ProductDetailsModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
