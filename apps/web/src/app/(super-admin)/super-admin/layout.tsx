"use client";

import "../../globals.css";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Store,
  ShieldCheck,
  Megaphone,
  Ticket,
  Activity,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SuperAdminNavBadge, PendingVendorsBadge } from "@/components/admin/nav-badge";
import { ThemeProvider } from "next-themes";

const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim());

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/admin"); // Redirect to generic login
        return;
      }

      // Simple Email Guard
      if (!SUPER_ADMIN_EMAILS.includes(user.email || "")) {
        alert("Access Denied: You are not a Super Admin.");
        router.push("/admin/dashboard"); // Redirect to regular vendor dash
        return;
      }

      // Initialize Super Admin Privileges (Create backend doc if missing)
      fetch("/api/super-admin/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid }),
      }).catch(console.error);

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const navItems = [
    { name: "Overview", href: "/super-admin", icon: LayoutDashboard },
    { name: "Vendors", href: "/super-admin/vendors", icon: Store },
    { name: "Users", href: "/super-admin/users", icon: Users },
    {
      name: "Support & Comms",
      href: "/super-admin/support",
      icon: Megaphone,
    },
    { name: "System Logs", href: "/super-admin/system-logs", icon: Activity },
  ];

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark" // Force Dark Mode for distinct look
      enableSystem={false}
      disableTransitionOnChange
    >
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900/50 backdrop-blur-xl border-r border-amber-500/20 transition-transform duration-300 md:relative md:translate-x-0",
            !isSidebarOpen && "-translate-x-full"
          )}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-bold text-black">
                S
              </div>
              <span className="font-bold tracking-tight text-lg">
                SUPER ADMIN
              </span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="px-3 space-y-1 mt-4">
            {navItems.map((item) => {
              const isActive =
                item.href === "/super-admin"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-amber-500/20 to-orange-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-900/20"
                      : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                  )}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.name === "Support & Comms" && <SuperAdminNavBadge />}
                    {item.name === "Vendors" && <PendingVendorsBadge />}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-3 right-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          <header className="h-16 border-b border-zinc-800 flex items-center px-6 gap-4 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-white/10 rounded-lg text-zinc-400"
            >
              <Menu size={24} />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-emerald-500">
                SYSTEM ONLINE
              </span>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
