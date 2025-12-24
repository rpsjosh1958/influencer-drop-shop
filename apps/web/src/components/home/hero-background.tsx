"use client";

import { motion } from "framer-motion";

// High-quality "Hype" images from Unsplash
// Local optimized assets
const ITEM_IMAGES = [
  "/assets/landing/item-1.jpg",
  "/assets/landing/item-2.jpg",
  "/assets/landing/item-3.jpg",
  "/assets/landing/item-4.jpg",
  "/assets/landing/item-5.jpg",
  "/assets/landing/item-6.jpg",
  "/assets/landing/item-7.jpg",
  "/assets/landing/item-8.jpg",
  "/assets/landing/item-9.jpg",
  "/assets/landing/item-10.jpg",
  "/assets/landing/item-11.jpg",
  "/assets/landing/item-12.jpg",
];

// Shuffle/Duplicate for infinite feel
const IMAGES_COL_1 = ITEM_IMAGES.slice(0, 6);
const IMAGES_COL_2 = ITEM_IMAGES.slice(3, 9);
const IMAGES_COL_3 = ITEM_IMAGES.slice(6, 12);
const IMAGES_COL_4 = [...ITEM_IMAGES.slice(9, 12), ...ITEM_IMAGES.slice(0, 3)];

export function HeroBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-black pointer-events-none">
      {/* Grid Container */}
      <div className="absolute -inset-[50%] opacity-40 rotate-[10deg] scale-110 flex gap-4 md:gap-8 justify-center">
        <Column images={IMAGES_COL_1} duration={40} />
        <Column images={IMAGES_COL_2} duration={55} offset={-50} />
        <Column images={IMAGES_COL_3} duration={45} />
        <Column
          images={IMAGES_COL_4}
          duration={60}
          offset={-100}
          className="hidden md:flex"
        />
      </div>

      {/* Vignette & Dimming */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black z-10" />
      <div className="absolute inset-0 bg-black/20 z-10" />
      <div className="absolute inset-0 z-10" />
    </div>
  );
}

function Column({
  images,
  duration,
  offset = 0,
  className = "",
}: {
  images: string[];
  duration: number;
  offset?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ y: offset }}
      animate={{ y: `-${50 + offset}%` }}
      transition={{
        ease: "linear",
        duration: duration,
        repeat: Infinity,
      }}
      className={`flex flex-col gap-4 md:gap-8 w-1/3 md:w-64 flex-shrink-0 ${className}`}
    >
      {[...images, ...images].map((src, idx) => (
        <div
          key={idx}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-900 border border-white/5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Drop item"
            className="h-full w-full object-cover grayscale hover:grayscale-0 transition-all duration-700 opacity-60"
          />
        </div>
      ))}
    </motion.div>
  );
}
