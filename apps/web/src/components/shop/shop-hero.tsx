"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const fontMap: Record<string, string> = {
  Inter: "var(--font-inter)",
  Roboto: "var(--font-roboto)",
  "Playfair Display": "var(--font-playfair)",
  "Courier Prime": "var(--font-courier)",
};

interface ShopHeroProps {
  theme: any;
}

export function ShopHero({ theme }: ShopHeroProps) {
  const [bgIndex, setBgIndex] = useState(0);

  const hero = theme?.hero || {};
  const {
    headline = "SECURE THE BAG.",
    subheadline = "Limited edition drops.",
    layout = "center",
    headlineColor = "#000000",
    backgroundImages = [],
    overlayOpacity = 0,
    headlineFont = "Inter",
    subheadlineFont = "Inter",
  } = hero;

  useEffect(() => {
    if (backgroundImages.length > 1) {
      const interval = setInterval(() => {
        setBgIndex((prev) => (prev + 1) % backgroundImages.length);
      }, 5000); // 5s slide
      return () => clearInterval(interval);
    }
  }, [backgroundImages]);

  if (!theme?.hero?.enabled) return <div className="pt-24" />;

  const alignClass =
    layout === "left"
      ? "text-left items-start"
      : layout === "right"
        ? "text-right items-end"
        : "text-center items-center";

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[60vh] flex flex-col justify-center">
      {/* Background Layer */}
      {backgroundImages.length > 0 && (
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={bgIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundImages[bgIndex]}
                alt="Hero"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
          {/* Overlay */}
          <div
            className="absolute inset-0 z-10 bg-black"
            style={{ opacity: overlayOpacity }}
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className={`relative z-20 max-w-5xl mx-auto w-full flex flex-col ${alignClass}`}
      >
        <h1
          className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 uppercase"
          style={{
            color: headlineColor,
            fontFamily:
              fontMap[headlineFont] || `'${headlineFont}', sans-serif`,
          }}
        >
          {headline}
        </h1>

        {subheadline && (
          <p
            className="text-xl md:text-2xl font-medium max-w-2xl leading-relaxed opacity-80"
            style={{
              color: headlineColor,
              fontFamily:
                fontMap[subheadlineFont] || `'${subheadlineFont}', sans-serif`,
            }}
          >
            {subheadline}
          </p>
        )}
      </motion.div>
    </section>
  );
}
