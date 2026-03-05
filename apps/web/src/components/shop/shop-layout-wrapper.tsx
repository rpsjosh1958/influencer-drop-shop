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
  Bell,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname, useParams } from "next/navigation";
import { CartProvider } from "./cart-provider";
import { CartDrawer } from "./cart-drawer";
import { OrdersDropdown } from "./orders-dropdown";
import { ProfileModal } from "./profile-modal";
import {
  NotificationProvider,
  useNotifications,
} from "@/context/notification-context";
import { useAlert } from "@/context/alert-context";
import { NotificationDropdown } from "./notification-dropdown";
import { AddedToCartToast } from "./added-to-cart-toast";
import { NotificationToast } from "./notification-toast";
import { HeaderSearch } from "./header-search";
import { ShopUIProvider } from "@/context/shop-ui-context";
import { OrderDetailsModal } from "./order-details-modal";
import { BookingDetailsModal } from "./booking-details-modal";
import { SnowfallEffect } from "./snowfall-effect";
import { StoreLoader } from "./store-loader";

export function ShopLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isLive, setIsLive] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(undefined); // undefined = loading

  // UI States
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  useEffect(() => {
    //
  }, [params, pathname]);

  // 1. Check Store Status
  useEffect(() => {
    const storeId = Array.isArray(params?.storeId)
      ? params.storeId[0]
      : (params?.storeId as string) || "default-store";

    const unsub = onSnapshot(
      doc(db, "stores", storeId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Assuming 'status' field controls live state. 'live' = open.
          setIsLive(data.status === "live");
        } else {
          console.warn(
            "ShopLayoutWrapper: Store doc does not exist. Defaulting to closed."
          );
          setIsLive(false);
        }
      },
      (error) => {
        console.error(
          "ShopLayoutWrapper: Store config access denied/error:",
          error
        );
        // Default to closed if we can't read config (likely due to auth rules)
        setIsLive(false);
      }
    );
    return () => unsub();
  }, [params]);

  // 2. Check Auth Status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsub();
  }, []);

  const { showAlert } = useAlert();

  const handleLogout = () => {
    showAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Sign Out",
      type: "error", // Using error style (red) for destructive action
      onConfirm: async () => {
        await signOut(auth);

        // Use window.location for a hard refresh to clear any lingering React state/listeners
        // or just router.replace with the correct store path
        const storeId = Array.isArray(params?.storeId)
          ? params.storeId[0]
          : (params?.storeId as string) || "default-store";
        router.replace(`/shop/${storeId}/login`);
      },
      onCancel: () => {},
    });
  };

  // Allow access to Login/Signup pages regardless of Store Status
  const isAuthPage =
    pathname.includes("/login") || pathname.includes("/signup");

  // Prevent flicker: If user is logged in but on auth page, redirect
  useEffect(() => {
    if (user && isAuthPage) {
      router.replace("/");
    }
  }, [user, isAuthPage, router]);

  // ...

  // Loading State
  if (isLive === null || user === undefined) {
    return <StoreLoader />;
  }

  // If redirecting, we can return null (or a loader) to avoid flashing content
  if (user && isAuthPage) {
    return null;
  }

  if (isAuthPage) {
    return (
      <ShopUIProvider>
        {children}
        <OrderDetailsModal />
        <BookingDetailsModal />
      </ShopUIProvider>
    );
  }
  return (
    <NotificationProvider>
      <ShopUIProvider>
        <NotificationToast />

        {/* Closed State Overlay */}

        {/* Closed State Overlay */}
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
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsNotificationsOpen(!isNotificationsOpen)
                      }
                      className="p-3 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white relative"
                      title="Notifications"
                    >
                      <Bell size={24} />
                      <NotificationBadge />
                    </button>
                    <NotificationDropdown
                      isOpen={isNotificationsOpen}
                      onClose={() => setIsNotificationsOpen(false)}
                    />
                  </div>

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
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals and Overlays (Rendered at root for portal-like behavior) */}
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

        {/* Active Shop Content */}
        {(isLive || isAuthPage) && (
          <CartProvider>
            {children}
            <CartDrawer />
            <AddedToCartToast />
          </CartProvider>
        )}

        <OrderDetailsModal />
        <BookingDetailsModal />
      </ShopUIProvider>
    </NotificationProvider>
  );
}

// Helper to access context inside Provider
function NotificationBadge() {
  const { unreadCount } = useNotifications();
  if (unreadCount === 0) return null;
  return (
    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-cyan-500 rounded-full border border-black" />
  );
}
