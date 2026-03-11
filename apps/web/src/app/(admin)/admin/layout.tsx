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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers";
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
              setLoading(false);
            } else {
              router.push("/create-store");
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
        <div className="font-bold text-lg tracking-tighter text-zinc-900 dark:text-zinc-50 truncate max-w-[200px]">
          {storeName || "DROP."}
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
              <h1 className="text-xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-50 truncate max-w-[180px]">
                {storeName || "DROP."}
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
        <div className="p-6 flex items-center justify-between h-20">
          {!collapsed && (
            <h1 
              data-tour="sidebar-brand"
              className="text-xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-50 truncate max-w-[160px]"
            >
              {storeName || "DROP."}
            </h1>
          )}
          <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right">
            <button
              data-tour="sidebar-collapse"
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          </Tooltip>
        </div>

        <nav 
          data-tour="sidebar-menu"
          className="flex-1 px-3 space-y-2 overflow-y-auto custom-scrollbar"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const linkContent = (
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
                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between">
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

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
          {collapsed ? (
            <Tooltip content="Broadcast" side="right">
              <button
                data-tour="sidebar-broadcast"
                onClick={() => setShowBroadcast(true)}
                className="flex items-center justify-center p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors w-full"
              >
                <Megaphone size={20} className="w-5 h-5 flex-shrink-0" />
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

          <div
            className={cn(
              "flex items-center justify-between",
              collapsed && "flex-col gap-2"
            )}
          >
            {collapsed ? (
              <Tooltip content="Logout" side="right">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full"
                >
                  <LogOut size={20} className="flex-shrink-0" />
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors w-full"
              >
                <LogOut size={20} className="flex-shrink-0" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>

        <BroadcastModal
          isOpen={showBroadcast}
          onClose={() => setShowBroadcast(false)}
        />
      </aside>
    </>
  );
}
