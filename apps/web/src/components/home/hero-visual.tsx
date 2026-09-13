"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// Dashboard shows first — this hero is doing double duty selling the
// platform to prospective vendors, not just shoppers, so the admin view
// gets the first impression before it cycles to the storefront.
const HERO_SCENES = [
  {
    image: "/assets/landing/adminDashboard.png",
    alt: "The Drop admin dashboard",
    addressBar: "copdrop.io/admin/dashboard",
  },
  {
    image: "/assets/landing/shop.png",
    alt: "A live storefront on The Drop",
    addressBar: "copdrop.io/shop/yourbrand",
  },
];

const SCENE_INTERVAL_MS = 4500;

export function HeroVisual() {
  const [sceneIndex, setSceneIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSceneIndex((i) => (i + 1) % HERO_SCENES.length);
    }, SCENE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-w-0 pb-0 md:pb-[70px]">
      <div className="rounded-2xl overflow-hidden border border-[#14130F]/16 bg-white shadow-[0_40px_80px_-40px_rgba(20,19,15,0.4)]">
        <div className="flex items-center gap-2 px-3.5 py-[11px] border-b border-[#14130F]/10 bg-[#F7F5F0]">
          <span className="w-[9px] h-[9px] rounded-full bg-[#14130F]/16 block" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#14130F]/16 block" />
          <span className="w-[9px] h-[9px] rounded-full bg-[#14130F]/16 block" />
          <span className="ml-2.5 font-[family-name:var(--font-spline-mono)] text-[11px] text-[#14130F]/70 overflow-hidden text-ellipsis whitespace-nowrap">
            {HERO_SCENES[sceneIndex].addressBar}
          </span>
        </div>
        <div className="relative aspect-[2560/1310] bg-[#F7F5F0]">
          {HERO_SCENES.map((scene, i) => (
            <Image
              key={scene.image}
              src={scene.image}
              alt={scene.alt}
              fill
              priority={i === 0}
              className="object-cover object-top transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === sceneIndex ? 1 : 0 }}
              sizes="(max-width: 768px) 100vw, 620px"
            />
          ))}
        </div>
      </div>
      <Image
        src="/assets/landing/image1.png"
        alt="The Drop mobile app"
        width={190}
        height={251}
        className="hidden md:block absolute -right-1.5 bottom-0 w-[31%] max-w-[190px] h-auto"
        style={{ filter: "drop-shadow(0 30px 50px rgba(20,19,15,0.42))" }}
      />
    </div>
  );
}
