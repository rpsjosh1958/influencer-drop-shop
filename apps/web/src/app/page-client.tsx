"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { StoreSelector } from "@/components/home/store-selector";
import { useEffect, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HeroBackground } from "@/components/home/hero-background";
import { LandingFeatures } from "@/components/home/landing-features";
import { LandingAiShowcase } from "@/components/home/landing-ai-showcase";
import { LandingPricing } from "@/components/home/landing-pricing";
import { LandingFAQ } from "@/components/home/landing-faq";
import { LandingFooter } from "@/components/home/landing-footer";
import { LandingHowItWorks } from "@/components/home/landing-how-it-works";
import { LandingCommunity } from "@/components/home/landing-community";
import { LandingHeader } from "@/components/home/landing-header";

export function PlatformLandingClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      }
    >
      <PlatformLandingContent />
    </Suspense>
  );
}

function PlatformLandingContent() {
  const router = useRouter();

  return (
    <div className="bg-black text-white font-sans selection:bg-purple-500 selection:text-white">
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center">
        {/* Background scrolls WITH this section now */}
        <HeroBackground />

        {/* Hero Content */}
        <div className="relative z-20 text-center px-6 pt-20">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-8">
            OWN THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
              HYPE.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-zinc-300 font-medium max-w-2xl mx-auto leading-relaxed mb-6">
            Launch your professional store in seconds. Sell physical products, 
            bookable services, or both—all in one seamless ecosystem.
          </p>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 mb-12">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300">
              <span className="text-lg"></span> Zero Setup Cost
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300">
              <span className="text-lg"></span> Go Live in Minutes
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300">
              <span className="text-lg"></span> Universal Payment Options
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full md:w-auto">
            <Link
              href="/create-store"
              className="w-full md:w-auto bg-white text-black h-14 px-8 rounded-full text-lg font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)] border-2 border-transparent hover:border-purple-500"
            >
              Launch Your Store <ArrowRight size={20} />
            </Link>
            <StoreSelector />
          </div>
        </div>
      </section>

      <LandingHowItWorks />
      <LandingFeatures />
      <LandingAiShowcase />
      <LandingCommunity />
      <LandingPricing />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}
