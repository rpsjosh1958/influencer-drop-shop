"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { LayoutDashboard, Store, LogIn, Loader2 } from "lucide-react";

export function LandingHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Check if user has a store
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.ownedStores && userData.ownedStores.length > 0) {
              setHasStore(true);
            }
          }
        } catch (error) {
          console.error("Header: Failed to fetch user profile", error);
        }
      } else {
        setHasStore(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between transition-all duration-300">
      <Link href="/" className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/assets/landing/drop_logo.png"
          alt="The Drop"
          className="h-8 w-auto"
        />
        <span className="font-black tracking-tighter text-2xl text-white">
          THE DROP.
        </span>
      </Link>

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
        {loading ? (
          <div className="h-9 w-24 bg-white/10 rounded-full animate-pulse" />
        ) : user ? (
          <>
            {hasStore ? (
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-white/10"
              >
                <LayoutDashboard size={16} />
                Visit Dashboard
              </Link>
            ) : (
              <Link
                href="/create-store"
                className="flex items-center gap-2 bg-white text-black px-5 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-white/10"
              >
                <Store size={16} />
                Create Store
              </Link>
            )}
          </>
        ) : (
          <>
            <Link
              href="/admin"
              className="text-sm font-bold text-white hover:text-zinc-300 transition-colors mr-2"
            >
              Sign In
            </Link>
            <Link
              href="/create-store"
              className="hidden md:flex bg-white text-black px-6 py-2.5 rounded-full text-sm font-bold hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              Start Selling
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
