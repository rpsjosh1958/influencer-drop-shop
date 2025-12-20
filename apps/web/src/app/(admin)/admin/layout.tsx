"use client";

import "../../globals.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { BroadcastModal } from "@/components/admin/broadcast-modal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);

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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

      // Check auth logic
      if (!user && pathname !== "/admin") {
        router.push("/admin");
      } else if (user && pathname !== "/admin") {
        // Logged in and inside dashboard
        if (adminEmail && user.email !== adminEmail) {
          router.push("/");
        }
      } else if (user && pathname === "/admin") {
        // Logged in but on login page -> go to dashboard
        router.push("/admin/dashboard");
      }

      setLoading(false);
    });
    return () => unsub();
  }, [router, pathname]);

  if (loading) {
    return (
      <html lang="en">
        <body className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
          {/* Simple Loader */}
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </body>
      </html>
    );
  }

  const navItems = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/admin/products", icon: Package },
    { name: "Orders", href: "/admin/orders", icon: ShoppingBag },
  ];

  // Don't show sidebar on login page
  if (pathname === "/admin") {
    return (
      <html lang="en" suppressHydrationWarning>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex min-h-screen font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Sidebar */}
          <aside
            className={cn(
              "bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 hidden md:flex flex-col transition-all duration-300 ease-in-out relative",
              collapsed ? "w-20" : "w-64"
            )}
          >
            <div className="p-6 flex items-center justify-between">
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

            <nav className="flex-1 px-3 space-y-2">
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
                  "flex items-center gap-2 px-2 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors",
                  collapsed && "justify-center"
                )}
              >
                <Megaphone size={20} className="w-5 h-5" />
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
                    "flex items-center gap-2 px-2 py-2 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors",
                    collapsed && "justify-center"
                  )}
                >
                  <LogOut size={20} />
                  {!collapsed && <span>Logout</span>}
                </button>
              </div>

              
            </div>
            
            <BroadcastModal 
              isOpen={showBroadcast} 
              onClose={() => setShowBroadcast(false)} 
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto h-screen">
            <div className="h-full w-full max-w-7xl mx-auto p-6 md:p-8 space-y-8">
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
