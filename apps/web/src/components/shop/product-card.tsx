"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Star, Loader2 } from "lucide-react";
import { Product } from "@/types";

interface ProductCardProps {
  product: Product;
  index: number;
  addToCart: (product: Product) => void;
}

export function ProductCard({ product, index, addToCart }: ProductCardProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group cursor-pointer"
    >
      <div className="relative aspect-[4/5] bg-zinc-100 rounded-3xl overflow-hidden mb-4 shadow-sm group-hover:shadow-2xl transition-all duration-500">
        {/* Loading Spinner */}
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="animate-spin text-zinc-300" />
          </div>
        )}

        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          priority={index < 2} // Eager load first 2 images
          className={`object-cover group-hover:scale-105 transition-all duration-700 ${
            isImageLoaded ? "opacity-100 grayscale-0" : "opacity-0 grayscale"
          }`}
          onLoad={() => setIsImageLoaded(true)}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        <div
          className={`absolute top-4 right-4 backdrop-blur px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider z-10 ${
            product.stock > 0
              ? "bg-white/90 text-black"
              : "bg-red-500/90 text-white"
          }`}
        >
          {product.stock > 0 ? `${product.stock} Left` : "Sold Out"}
        </div>

        {/* Quick Add - Static for Mobile */}
        <div className="absolute inset-x-4 bottom-4 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (product.stock > 0) addToCart(product);
            }}
            disabled={product.stock <= 0}
            className={`w-full py-3 rounded-xl font-bold uppercase tracking-wide text-xs shadow-lg backdrop-blur-md transition-transform active:scale-95 ${
              product.stock > 0
                ? "bg-white/90 text-black hover:bg-white"
                : "bg-red-500/90 text-white cursor-not-allowed"
            }`}
          >
            {product.stock > 0 ? `Add to cart — GHS ${product.price}` : "Sold Out"}
          </button>
        </div>
      </div>

      <div className="space-y-1 px-2">
        <h3 className="text-lg font-bold tracking-tight">{product.name}</h3>
        <div className="flex items-center justify-between">
          <p className="text-zinc-500 text-sm line-clamp-1">
            {product.description}
          </p>
          <div className="flex items-center gap-1 text-xs font-bold bg-zinc-100 px-2 py-1 rounded-md">
            <Star size={10} className="fill-black" />
            5.0
          </div>
        </div>
      </div>
    </motion.div>
  );
}
