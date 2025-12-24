"use client";

import Link from "next/link";
import { Zap, ShoppingBag, ArrowRight, ChevronDown } from "lucide-react";
import { StoreSelector } from "@/components/home/store-selector";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

import { HeroBackground } from "@/components/home/hero-background";

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-white rounded-full" />
          <span className="font-black tracking-tighter text-xl">DROP.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="hidden md:flex bg-white text-black px-5 py-2 rounded-full text-sm font-bold hover:scale-105 transition-transform"
          >
            Log in to store
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

      {/* Example Next Section (Features) */}
      <section className="relative z-10 bg-zinc-950 py-32 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tight">
            BUILT FOR <span className="text-purple-500">SPEED</span>.
          </h2>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto">
            Everything you need to sell out significantly fast. Automated drops,
            bot protection, and instant payouts.
          </p>
          {/* Add more feature content here later */}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center bg-black relative z-10">
        <p className="text-zinc-600 text-sm">
          © 2025 CopDrop.io. Secure the bag.
        </p>
      </footer>
    </div>
  );
}
