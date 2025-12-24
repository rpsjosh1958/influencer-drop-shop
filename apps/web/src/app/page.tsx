"use client";

import Link from "next/link";
import { Zap, ShoppingBag, ArrowRight, ChevronDown } from "lucide-react";
import { StoreSelector } from "@/components/home/store-selector";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import { HeroBackground } from "@/components/home/hero-background";
import { LandingFeatures } from "@/components/home/landing-features";
import { LandingPricing } from "@/components/home/landing-pricing";
import { LandingFAQ } from "@/components/home/landing-faq";
import { LandingFooter } from "@/components/home/landing-footer";
import { LandingHowItWorks } from "@/components/home/landing-how-it-works";
import { LandingCommunity } from "@/components/home/landing-community";

export default function PlatformLanding() {
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
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user has a last visited store
    const lastStoreId = localStorage.getItem("copdrop_last_visited_store");
    const shouldStay = searchParams.get("stay");

    if (!lastStoreId || shouldStay === "true") return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push(`/shop/${lastStoreId}`);
      }
    });

    return () => unsubscribe();
  }, [router, searchParams]);
  return (
    <div className="bg-black text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* Header (Fixed) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500" />
          <span className="font-black tracking-tighter text-2xl">DROP.</span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#ecosystem" className="hover:text-white transition-colors">
            Ecosystem
          </a>
          <a href="#pricing" className="hover:text-white transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm font-bold text-white hover:text-zinc-300 transition-colors mr-4"
          >
            Sign In
          </Link>
          <Link
            href="/create-store"
            className="hidden md:flex bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform"
          >
            Start Selling
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center">
        {/* Background scrolls WITH this section now */}
        <HeroBackground />

        {/* Hero Content */}
        <div className="relative z-20 text-center px-6 pt-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 text-white text-xs font-bold uppercase tracking-widest mb-8 border border-white/10 hover:bg-white/20 transition-colors cursor-default">
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            The Drop Platform
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none mb-8">
            OWN THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500">
              HYPE.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-white-400 font-medium max-w-2xl mx-auto leading-relaxed mb-12">
            The all-in-one platform for stores to launch exclusive drops.
            Limited stock. High demand. Zero friction.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 w-full md:w-auto">
            <Link
              href="/create-store"
              className="w-full md:w-auto bg-white text-black h-14 px-8 rounded-full text-lg font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              Launch Your Store <ArrowRight size={20} />
            </Link>
            <StoreSelector />
          </div>
        </div>
      </section>

      <LandingHowItWorks />
      <LandingFeatures />
      <LandingCommunity />
      <LandingPricing />
      <LandingFAQ />
      <LandingFooter />
    </div>
  );
}
