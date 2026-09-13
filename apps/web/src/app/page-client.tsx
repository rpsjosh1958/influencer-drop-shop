"use client";

import { Suspense } from "react";
import { LandingHeader } from "@/components/home/landing-header";
import { LandingHero } from "@/components/home/landing-hero";
import { LandingLiveStores } from "@/components/home/landing-live-stores";
import { LandingHowItWorks } from "@/components/home/landing-how-it-works";
import { LandingFeatures } from "@/components/home/landing-features";
import { LandingAiShowcase } from "@/components/home/landing-ai-showcase";
import { LandingTestimonials } from "@/components/home/landing-testimonials";
import { LandingStats } from "@/components/home/landing-stats";
import { LandingPricing } from "@/components/home/landing-pricing";
import { LandingFAQ } from "@/components/home/landing-faq";
import { LandingFinalCta } from "@/components/home/landing-final-cta";
import { LandingFooter } from "@/components/home/landing-footer";

export function PlatformLandingClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#EFEBE3]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14130F]" />
        </div>
      }
    >
      <PlatformLandingContent />
    </Suspense>
  );
}

function PlatformLandingContent() {
  return (
    <div className="bg-[#EFEBE3] text-[#14130F] font-[family-name:var(--font-schibsted)] antialiased overflow-x-hidden selection:bg-[#14130F] selection:text-[#EFEBE3]">
      <LandingHeader />
      <LandingHero />
      <LandingLiveStores />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingAiShowcase />
      <LandingTestimonials />
      <LandingStats />
      <LandingPricing />
      <LandingFAQ />
      <LandingFinalCta />
      <LandingFooter />
    </div>
  );
}
