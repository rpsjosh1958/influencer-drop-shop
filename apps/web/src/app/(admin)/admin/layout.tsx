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
  MessageCircle,
  Calendar,
  Briefcase,
  Clock,
  Loader2,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { BroadcastModal } from "@/components/admin/broadcast-modal";
import {
  AdminStoreProvider,
  useAdminStore,
} from "@/components/admin/admin-store-provider";
import { AiAssistant } from "@/components/admin/ai-assistant";
import { AdminNavBadge } from "@/components/admin/nav-badge";
import { useMemo } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { OnboardingProvider } from "@/context/onboarding-context";
import { ThemeProvider } from "next-themes";
import { StoreSwitcher } from "@/components/admin/store-switcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
          <Loader2 className="animate-spin text-white" size={32} />
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
  // A logged-in account with no owned stores used to be silently redirected
  // straight into the /create-store vendor-registration wizard — no
  // explanation, and that page had no way to leave either. Show an
  // explicit choice instead, since this is often just a customer who
  // logged into the wrong portal by mistake, not someone who actually
  // wants to register as a vendor right now.
  const [showVendorPrompt, setShowVendorPrompt] = useState(false);
  const [lastVisitedStore, setLastVisitedStore] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copdrop_last_visited_store");
      if (saved) setLastVisitedStore(saved);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/admin");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Safety Timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("Auth check timed out, forcing logout/redirect");
        setLoading(false);
        // Optional: you could force logout here if you want to be safe
        // signOut(auth);
      }
    }, 10000); // 10 seconds timeout

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // 1. Not logged in - Middleware should catch this, but we'll keep a fallback
      if (!user) {
        if (pathname !== "/admin") {
          router.push("/admin");
        }
        setLoading(false);
        return;
      }

      // 2. Already at Login with valid session -> Go to dashboard
      if (pathname === "/admin") {
        const redirectPath = searchParams.get("redirect");
        router.push(redirectPath || "/admin/dashboard");
        return;
      }

      // 3. Verify Store Ownership (Realtime)
      unsubscribeSnapshot = onSnapshot(
        doc(db, "users", user.uid),
        (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const ownedStores = userData?.ownedStores || [];

            if (ownedStores.length > 0) {
              setShowVendorPrompt(false);
              setLoading(false);
            } else {
              setShowVendorPrompt(true);
              setLoading(false);
            }
          } else {
            console.error("User profile document missing");
            setLoading(false);
          }
        },
        (error) => {
          console.error("Profile check failed", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

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

  // Logged in, but this account doesn't own a store — most often a
  // customer account that ended up here by mistake, not necessarily
  // someone who wants to register as a vendor right now.
  if (showVendorPrompt) {
    return (
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
        <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Store className="w-8 h-8 text-zinc-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold">No store linked to this account</h1>
              <p className="text-zinc-400 text-sm mt-2">
                This is the vendor admin portal, and this account isn&apos;t
                registered as a vendor yet. Want to set one up?
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/create-store")}
                className="w-full py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors"
              >
                Create a Store
              </button>
              <button
                onClick={() =>
                  router.push(lastVisitedStore ? `/shop/${lastVisitedStore}` : "/")
                }
                className="w-full py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-800 transition-colors"
              >
                {lastVisitedStore ? "Back to Shopping" : "Back Home"}
              </button>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors mt-2"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Wrap the main content with a component that has access to store context
  return (
    <div className="antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex min-h-screen font-sans relative">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AdminStoreProvider>
          <OnboardingProvider>
            <DynamicSidebar
              pathname={pathname}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              showBroadcast={showBroadcast}
              setShowBroadcast={setShowBroadcast}
              handleLogout={handleLogout}
            />

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto h-screen w-full relative z-0 pt-16 md:pt-0">
              <div className="h-full w-full max-w-7xl mx-auto p-4 md:p-8 space-y-8">
                {children}
              </div>
            </main>
            <AiAssistant />
          </OnboardingProvider>
        </AdminStoreProvider>
      </ThemeProvider>
    </div>
  );
}

// Separate component that uses the store context for dynamic nav
function DynamicSidebar({
  pathname,
  collapsed,
  setCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  showBroadcast,
  setShowBroadcast,
  handleLogout,
}: {
  pathname: string;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
  showBroadcast: boolean;
  setShowBroadcast: (value: boolean) => void;
  handleLogout: () => void;
}) {
  const { storeFeatures, storeName } = useAdminStore();

  // Dynamic navigation items based on store features
  const navItems = useMemo(() => {
    const items = [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ];

    // Product-related items (for product or hybrid stores)
    if (storeFeatures?.hasProducts !== false) {
      items.push(
        { name: "Products", href: "/admin/products", icon: Package },
        { name: "Categories", href: "/admin/categories", icon: Tag },
        { name: "Orders", href: "/admin/orders", icon: ShoppingBag }
      );
    }

    // Service-related items (for service or hybrid stores)
    if (storeFeatures?.hasServices) {
      items.push(
        { name: "Services", href: "/admin/services", icon: Briefcase },
        { name: "Bookings", href: "/admin/bookings", icon: Calendar },
        { name: "Schedule", href: "/admin/schedule", icon: Clock }
      );
    }

    // Common items for all store types
    items.push(
      { name: "Finance", href: "/admin/finance", icon: Wallet },
      { name: "Complaints", href: "/admin/complaints", icon: MessageCircle },
      { name: "Support", href: "/admin/support", icon: Megaphone },
      { name: "Settings", href: "/admin/settings", icon: Settings }
    );

    return items;
  }, [storeFeatures]);

  return (
    <>
      {/* MOBILE HEADER - Visible only on mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 z-40 w-full">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 -ml-2 mr-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
        >
          <Menu size={24} />
        </button>
        {/* CHANGED FROM: "flex-1 truncate" */}
        <div className="flex-1 min-w-0">
          <StoreSwitcher />
        </div>
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
              {/* CHANGED FROM: "flex-1 truncate pr-4 pt-4" */}
              <div className="flex-1 min-w-0 pr-4 pt-4">
                <StoreSwitcher />
              </div>
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
                    <span className="flex-1">{item.name}</span>
                    {item.name === "Complaints" && (
                      <AdminNavBadge type="complaints" />
                    )}
                    {item.name === "Orders" && <AdminNavBadge type="orders" />}
                    {item.name === "Bookings" && (
                      <AdminNavBadge type="bookings" />
                    )}
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
          "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col transition-all duration-300 ease-in-out relative sticky top-0 h-screen z-40",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className={cn(
          "pt-6 px-4 flex transition-all duration-300 mb-6",
          collapsed ? "flex-col items-center gap-4" : "flex-row items-center gap-2"
        )}>
          <div className="flex-1 min-w-0">
            <StoreSwitcher collapsed={collapsed} />
          </div>
          <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right">
            <button
              data-tour="sidebar-collapse"
              onClick={() => setCollapsed(!collapsed)}
              className={cn(
                "rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50",
                collapsed ? "w-12 h-12" : "w-12 h-12"
              )}
            >
              {collapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
          </Tooltip>
        </div>

        <nav 
          data-tour="sidebar-menu"
          className={cn(
            "flex-1 space-y-2 overflow-y-auto custom-scrollbar",
            collapsed ? "px-4" : "px-3"
          )}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const linkContent = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center transition-all duration-200",
                  collapsed 
                    ? "justify-center w-12 h-12 rounded-2xl mx-auto" 
                    : "gap-3 px-3 py-2.5 rounded-xl text-sm font-medium",
                  isActive
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
                )}
              >
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between truncate">
                    <span>{item.name}</span>
                    {item.name === "Complaints" && (
                      <AdminNavBadge type="complaints" />
                    )}
                    {item.name === "Orders" && <AdminNavBadge type="orders" />}
                    {item.name === "Bookings" && (
                      <AdminNavBadge type="bookings" />
                    )}
                  </div>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} content={item.name} side="right">
                  {linkContent}
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        <div className={cn(
          "border-t border-zinc-200 dark:border-zinc-800 space-y-2",
          collapsed ? "p-4 flex flex-col items-center" : "p-4"
        )}>
          {collapsed ? (
            <Tooltip content="Broadcast" side="right">
              <button
                data-tour="sidebar-broadcast"
                onClick={() => setShowBroadcast(true)}
                className="flex items-center justify-center w-12 h-12 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-2xl transition-colors border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30"
              >
                <Megaphone size={20} className="shrink-0" />
              </button>
            </Tooltip>
          ) : (
            <button
              data-tour="sidebar-broadcast"
              onClick={() => setShowBroadcast(true)}
              className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors w-full"
            >
              <Megaphone size={20} className="w-5 h-5 flex-shrink-0" />
              <span>Broadcast</span>
            </button>
          )}

          {collapsed ? (
            <Tooltip content="Logout" side="right">
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-12 h-12 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
              >
                <LogOut size={20} className="shrink-0" />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors w-full"
            >
              <LogOut size={20} className="flex-shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </div>

        <BroadcastModal
          isOpen={showBroadcast}
          onClose={() => setShowBroadcast(false)}
        />
      </aside>
    </>
  );
}
