"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface HeadlineVariant {
  emphasis: string;
  rest: string;
}

// First line ("A real storefront,") stays put — only the second line
// rotates, each variant naming a different pain point the platform removes.
const HEADLINE_VARIANTS: HeadlineVariant[] = [
  { emphasis: "not another link", rest: " in bio." },
  { emphasis: "no more", rest: " DM for price." },
  { emphasis: "no more", rest: " missing orders." },
];

const ROTATE_MS = 3200;

export function HeroHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % HEADLINE_VARIANTS.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const variant = HEADLINE_VARIANTS[index];

  return (
    <h1 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(42px,5.6vw,76px)] leading-[1.02] tracking-[-0.012em] text-balance">
      A real storefront,
      <br />
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="inline-block"
        >
          <em className="not-italic text-[#B4472B]">{variant.emphasis}</em>
          {variant.rest}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}
