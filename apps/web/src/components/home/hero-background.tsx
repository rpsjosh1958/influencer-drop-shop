"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const IMAGES = [
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
  "https://images.unsplash.com/photo-1523398002811-999ca8dec234?q=80&w=1000",
  "https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1000",
  "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=1000",
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000",
  "https://images.unsplash.com/photo-1511556532299-8f662fc26c06?q=80&w=1000",
  "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=1000",
  "https://images.unsplash.com/photo-1512353087810-25dfcd100962?q=80&w=1000",
  "https://images.unsplash.com/photo-1581655353564-df123a1eb820?q=80&w=1000",
  "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1000",
];

function FadingImageCell({ delay }: { delay: number }) {
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    // Client-side only initialization to prevent hydration mismatch
    setCurrentImage(IMAGES[Math.floor(Math.random() * IMAGES.length)]);

    const changeImage = () => {
      setCurrentImage((prev) => {
        let next;
        do {
          next = IMAGES[Math.floor(Math.random() * IMAGES.length)];
        } while (next === prev);
        return next;
      });
    };

    const timeout = setTimeout(() => {
      const interval = setInterval(changeImage, 4000 + Math.random() * 4000);
      return () => clearInterval(interval);
    }, delay * 1000);

    return () => clearTimeout(timeout);
  }, [delay]);

  return (
    <div className="relative w-full h-full bg-zinc-900/50 overflow-hidden rounded-lg">
      <AnimatePresence mode="popLayout">
        {currentImage && (
          <motion.img
            key={currentImage}
            src={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full object-cover grayscale opacity-50"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function HeroBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-none">
      <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 p-2 opacity-60">
        {Array.from({ length: 30 }).map((_, i) => (
          <FadingImageCell key={i} delay={Math.random() * 5} />
        ))}
      </div>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60 z-10" />
      <div className="absolute inset-0 bg-black/10 z-10" />
    </div>
  );
}
