"use client";

import "../../globals.css";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Tag,
  Settings,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { BroadcastModal } from "@/components/admin/broadcast-modal";
import { AdminStoreProvider } from "@/components/admin/admin-store-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear middleware cookie
      document.cookie =
        "isAdminLoggedIn=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      router.push("/admin");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // 1. Not logged in
      if (!user) {
        if (pathname !== "/admin") {
          router.push("/admin");
        }
        setLoading(false);
        return;
      }

      // 2. Logged in (Login Page) -> Go to dashboard or redirect
      if (pathname === "/admin") {
        const redirectPath = searchParams.get("redirect");
        router.push(redirectPath || "/admin/dashboard");
        // Don't set loading false here, wait for redirect
        return;
      }

      // 3. Gatekeeper: Check Store Ownership (Realtime)
      // Use onSnapshot to immediately detect when a store is created/linked
      unsubscribeSnapshot = onSnapshot(
        doc(db, "users", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const ownedStores = userData?.ownedStores || [];

            if (ownedStores.length > 0) {
              setLoading(false);
            } else {
              router.push("/create-store");
            }
          }
        },
        (error) => {
          console.error("Profile check failed", error);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [router, pathname, searchParams]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Categories", href: "/admin/categories", icon: Tag },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
    { name: "Finance", href: "/admin/finance", icon: Wallet },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  // Don't show sidebar on login page
  if (pathname === "/admin") {
    return (
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    );
  }

  return (
    <div className="antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex min-h-screen font-sans relative">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AdminStoreProvider>
          {/* MOBILE HEADER - Visible only on mobile */}
          <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 z-40 w-full">
            <div className="font-bold text-lg tracking-tighter bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              DROP.
            </div>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -mr-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* MOBILE DRAWER / SHEET */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Drawer Content */}
              <div className="absolute top-0 bottom-0 left-0 w-[280px] bg-white dark:bg-zinc-900 shadow-xl animate-in slide-in-from-left duration-200 flex flex-col">
                <div className="p-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                  <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    DROP.
                  </h1>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 -mr-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                            : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
                        )}
                      >
                        <item.icon
                          size={20}
                          className={isActive ? "text-purple-400" : ""}
                        />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2 bg-zinc-50/50 dark:bg-zinc-900/50">
                  <button
                    onClick={() => setShowBroadcast(true)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 rounded-xl transition-colors"
                  >
                    <Megaphone size={20} />
                    <span>Broadcast</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                  >
                    <LogOut size={20} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DESKTOP Sidebar - Hidden on Mobile */}
          <aside
            className={cn(
              "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col transition-all duration-300 ease-in-out relative sticky top-0 h-screen",
              collapsed ? "w-20" : "w-64"
            )}
          >
            <div className="p-6 flex items-center justify-between h-20">
              {!collapsed && (
                <h1 className="text-xl font-bold tracking-tighter bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  DROP.
                </h1>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {collapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronLeft size={18} />
                )}
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                        : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <button
                onClick={() => setShowBroadcast(true)}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors w-full",
                  collapsed && "justify-center"
                )}
              >
                <Megaphone size={20} className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>Broadcast</span>}
              </button>

              <div
                className={cn(
                  "flex items-center justify-between",
                  collapsed && "flex-col gap-2"
                )}
              >
                <button
                  onClick={handleLogout}
                  className={cn(
                    "flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full",
                    collapsed && "justify-center"
                  )}
                >
                  <LogOut size={20} className="flex-shrink-0" />
                  {!collapsed && <span>Logout</span>}
                </button>
              </div>
            </div>

            <BroadcastModal
              isOpen={showBroadcast}
              onClose={() => setShowBroadcast(false)}
            />
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-auto h-screen w-full relative pt-16 md:pt-0">
            <div className="h-full w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
              {children}
            </div>
          </main>
        </AdminStoreProvider>
      </ThemeProvider>
    </div>
  );
}
