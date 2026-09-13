"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const NAV_LINKS = [
  { href: "#stores", label: "Stores" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Platform" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          const ownedStores = userDoc.exists()
            ? userDoc.data().ownedStores
            : null;
          setHasStore(!!ownedStores && ownedStores.length > 0);
        } catch (error) {
          console.error("LandingHeader: failed to fetch user profile", error);
        }
      } else {
        setHasStore(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-[#EFEBE3]/90 backdrop-blur-md border-b border-[#14130F]/10">
      <div className="max-w-[1240px] mx-auto px-6 md:px-7 py-3.5 flex items-center gap-6 md:gap-8">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/assets/landing/drop_logo.png"
            alt="The Drop"
            width={30}
            height={30}
            className="rounded-[7px] block"
          />
          <span className="font-[family-name:var(--font-hanson)] mt-1 text-[20px] tracking-tight text-[#14130F]">
            THE DROP.
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 ml-auto text-[13.5px] font-medium text-[#14130F]/62 flex-wrap">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-[#B4472B] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3.5 shrink-0 ml-auto md:ml-0">
          {loading ? (
            <div className="h-9 w-24 rounded-full bg-[#14130F]/8 animate-pulse" />
          ) : user ? (
            <Link
              href={hasStore ? "/admin/dashboard" : "/create-store"}
              className="bg-[#14130F] text-[#EFEBE3] px-[18px] py-2.5 rounded-full text-[13.5px] font-semibold whitespace-nowrap hover:bg-[#B4472B] hover:text-white transition-colors"
            >
              {hasStore ? "Visit dashboard" : "Create store"}
            </Link>
          ) : (
            <>
              <Link
                href="/admin"
                className="hidden md:inline text-[13.5px] font-semibold text-[#14130F]/70 hover:text-[#14130F]"
              >
                Sign in
              </Link>
              <Link
                href="/create-store"
                className="bg-[#14130F] text-[#EFEBE3] px-[18px] py-2.5 rounded-full text-[13.5px] font-semibold whitespace-nowrap hover:bg-[#B4472B] hover:text-white transition-colors"
              >
                Start selling
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
