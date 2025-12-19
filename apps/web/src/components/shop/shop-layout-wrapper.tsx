"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  Loader2,
  Lock,
  LogOut,
  Package,
  User,
  Instagram,
  Ghost,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { CartProvider } from "./cart-provider";
import { CartDrawer } from "./cart-drawer";
import { OrdersDropdown } from "./orders-dropdown";
import { ProfileModal } from "./profile-modal";

export function ShopLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(undefined); // undefined = loading

  // UI States for Closed Screen interaction
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();

  // 1. Check Store Status
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "system", "config"),
      (doc) => {
        if (doc.exists()) {
          setIsLive(doc.data().isLive);
        } else {
          setIsLive(false);
        }
      },
      (error) => {
        console.error("System config access denied:", error);
        // Default to closed if we can't read config (likely due to auth rules)
        setIsLive(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Check Auth Status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsub();
  }, []);

  // 3. Handle Redirects - REMOVED GUEST BLOCK. Guests allowed.
  // We only care if store is CLOSED (isLive === false), which is handled by conditional rendering below.

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  // Loading State
  if (isLive === null || user === undefined) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black text-white">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  // Allow access to Login/Signup pages regardless of Store Status (or maybe not? User said "directed to login page when trying to access the shop when they're not logged in")
  // Note: This wrapper wraps `(shop)/layout.tsx`. If `login` is inside `(shop)`, it is wrapped.
  // We should allow rendering if pathname is login/signup.
  const isAuthPage =
    pathname.includes("/login") || pathname.includes("/signup");

  // Prevent flicker: If user is logged in but on auth page, show nothing (redirecting)
  if (user && isAuthPage) {
    router.replace("/");
    return null;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {!isLive && !isAuthPage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white p-6 text-center"
          >
            {/* Top Right Header for Logged In Users */}
            {user && (
              <div className="absolute top-6 right-6 flex items-center gap-4 z-50">
                <button
                  onClick={() => setIsOrdersOpen(true)}
                  className="p-3 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white"
                  title="Your Orders"
                >
                  <Package size={24} />
                </button>

                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="p-3 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white"
                  >
                    <User size={24} />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 rounded-xl shadow-xl border border-zinc-800 overflow-hidden z-50 py-1 text-left"
                      >
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsProfileOpen(true);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-800 flex items-center gap-2"
                        >
                          <User size={16} /> Profile
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-red-900/20 text-red-500 flex items-center gap-2"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="max-w-md space-y-8"
            >
              <Lock size={64} className="mx-auto text-zinc-500" />
              <h1 className="text-6xl font-black tracking-tighter uppercase">
                Drop Closed
              </h1>
              <p className="text-zinc-400 text-lg">
                The store is currently offline. <br />
                Follow our socials for the next drop time.
              </p>

              {/* Socials */}
              <div className="flex items-center justify-center gap-6 pt-4">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-zinc-900 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all hover:scale-110"
                >
                  <Instagram size={24} />
                </a>
                <a
                  href="https://snapchat.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-zinc-900 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all hover:scale-110"
                >
                  <Ghost size={24} />
                </a>
              </div>

              {/* Optional: Original Sign Out button removed as it's now in the dropdown */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portals for Modals (Render these outside the conditional motion.div to ensure they work) */}
      <OrdersDropdown
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        user={user}
      />
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />

      {(isLive || isAuthPage) && (
        <CartProvider>
          {children}
          <CartDrawer />
        </CartProvider>
      )}
    </>
  );
}
