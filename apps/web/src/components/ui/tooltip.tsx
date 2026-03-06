"use client";

import React, { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
}

export function Tooltip({
  content,
  children,
  side = "right",
  className,
  delay = 0.2,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutId = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      switch (side) {
        case "top":
          top = rect.top + scrollY - 8;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case "bottom":
          top = rect.bottom + scrollY + 8;
          left = rect.left + scrollX + rect.width / 2;
          break;
        case "left":
          top = rect.top + scrollY + rect.height / 2;
          left = rect.left + scrollX - 8;
          break;
        case "right":
          top = rect.top + scrollY + rect.height / 2;
          left = rect.right + scrollX + 8;
          break;
      }

      setCoords({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updateCoords();
    timeoutId.current = setTimeout(() => {
      setIsVisible(true);
    }, delay * 1000);
  };

  const handleMouseLeave = () => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    setIsVisible(false);
  };

  // Close on click
  const handleClick = () => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    setIsVisible(false);
  };

  const sideStyles = {
    top: "-translate-x-1/2 -translate-y-full",
    bottom: "-translate-x-1/2",
    left: "-translate-x-full -translate-y-1/2",
    right: "-translate-y-1/2",
  };

  const animationVariants = {
    initial: {
      opacity: 0,
      scale: 0.95,
      x: side === "left" ? 5 : side === "right" ? -5 : 0,
      y: side === "top" ? 5 : side === "bottom" ? -5 : 0,
    },
    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      x: side === "left" ? 5 : side === "right" ? -5 : 0,
      y: side === "top" ? 5 : side === "bottom" ? -5 : 0,
    },
  };

  return (
    <div
      ref={triggerRef}
      className="flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {isVisible && (
              <motion.div
                initial="initial"
                animate="animate"
                exit="exit"
                variants={animationVariants}
                style={{
                  position: "absolute",
                  top: coords.top,
                  left: coords.left,
                  zIndex: 9999,
                }}
                className={cn(
                  "px-2 py-1 text-xs font-medium text-white bg-zinc-900 dark:bg-zinc-800 rounded shadow-xl whitespace-nowrap pointer-events-none border border-zinc-800 dark:border-zinc-700",
                  sideStyles[side],
                  className
                )}
              >
                {content}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
