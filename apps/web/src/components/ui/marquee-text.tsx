"use client";

import { useEffect, useRef, useState } from "react";

// Pixels/second the text scrolls at once it overflows — kept constant so a
// longer message doesn't feel like it's racing past faster than a short one.
const SPEED_PX_PER_SEC = 60;
const GAP_PX = 48;

interface MarqueeTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

// Renders `text` as-is, centered, unless it's too wide for its container —
// then it switches to a continuously scrolling loop instead of truncating,
// so the full message stays readable on narrow (mostly mobile) viewports.
export function MarqueeText({ text, className = "", style }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [textWidth, setTextWidth] = useState(0);

  useEffect(() => {
    const check = () => {
      if (!containerRef.current || !textRef.current) return;
      setTextWidth(textRef.current.scrollWidth);
      setOverflowing(textRef.current.scrollWidth > containerRef.current.clientWidth);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text]);

  const duration = (textWidth + GAP_PX) / SPEED_PX_PER_SEC;

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`} style={style}>
      <div
        className={overflowing ? "flex w-max" : "flex justify-center"}
        style={
          overflowing
            ? { animation: `marquee ${duration}s linear infinite` }
            : undefined
        }
      >
        <span ref={textRef} className="whitespace-nowrap" style={{ paddingRight: overflowing ? GAP_PX : 0 }}>
          {text}
        </span>
        {overflowing && (
          <span className="whitespace-nowrap" style={{ paddingRight: GAP_PX }} aria-hidden="true">
            {text}
          </span>
        )}
      </div>
    </div>
  );
}
