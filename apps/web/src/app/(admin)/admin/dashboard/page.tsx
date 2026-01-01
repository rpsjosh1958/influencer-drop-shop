"use client";

import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CreditCard,
  Package,
  Users,
  Zap,
  Store,
  TrendingUp,
  ShoppingBag,
  BadgeCheck,
} from "lucide-react";
import { useAdminStore } from "@/components/admin/admin-store-provider";

// Force Rebuild
export default function AdminDashboard() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [storeName, setStoreName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Real-time listener for Store Config
  useEffect(() => {
    if (!storeId) return;

    // In multi-vendor, 'isLive' is a property of the store document itself
    const unsub = onSnapshot(doc(db, "stores", storeId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsLive(data.status === "live");
        setStoreName(data.name);
        setIsVerified(!!data.isVerified);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  // Real-time listener for Metrics & Recent Orders
  useEffect(() => {
    if (!storeId) return;

    const q = query(
      collection(db, "stores", storeId, "orders"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      let totalRev = 0;
      let count = 0;
      const recent: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();

        // 1. Status Check (Include ALL paid/fulfilled statuses)
        const isPaidOrFulfilled = [
          "paid",
          "processing",
          "packaged",
          "sent-out",
          "shipped",
          "delivered",
          "completed",
        ].includes(data.status);

        if (isPaidOrFulfilled) {
          // 2. Month Filter
          let matchesMonth = true;
          if (selectedMonth && data.createdAt) {
            const date = data.createdAt.toDate();
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            if (monthKey !== selectedMonth) matchesMonth = false;
          }

          if (matchesMonth) {
            totalRev += data.total || 0;
            count++;
          }
        }

        // Recent Orders Feed (Always show top 5 regardless of filter, or maybe filter? User asked specifically for revenue filtering)
        // Leaving recent orders as "Live Feed" independent of revenue filter usually makes sense, but consistency is good.
        // Let's filter Recent Orders too if a month is selected, so the dashboard reflects that timeframe.

        let matchesRecentFilter = true;
        if (selectedMonth && data.createdAt) {
          const date = data.createdAt.toDate();
          const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
          if (monthKey !== selectedMonth) matchesRecentFilter = false;
        }

        if (matchesRecentFilter && recent.length < 5) {
          recent.push({ id: doc.id, ...data });
        }
      });
      setRevenue(totalRev);
      setOrdersCount(count);
      setRecentOrders(recent);
    });
    return () => unsub();
  }, [storeId, selectedMonth]);

  // Real-time listener for Inventory Summary
  useEffect(() => {
    if (!storeId) return;

    const q = query(
      collection(db, "stores", storeId, "products"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    });
    return () => unsub();
  }, [storeId]);

  const toggleStore = async () => {
    if (!storeId) return;
    try {
      await updateDoc(doc(db, "stores", storeId), {
        status: isLive ? "maintenance" : "live",
      });
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  if (storeLoading || !storeId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
  }

  const metrics = [
    {
      title: "Total Revenue",
      value: `GHS ${revenue.toFixed(2)}`,
      icon: CreditCard,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Total Orders",
      value: ordersCount.toString(),
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Store Status",
      value: isLive ? "Active" : "Paused",
      icon: Zap,
      color: isLive ? "text-yellow-500" : "text-zinc-500",
      bg: isLive ? "bg-yellow-500/10" : "bg-zinc-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {storeName || "Store"} Dashboard
            {isVerified && (
              <BadgeCheck className="inline-block ml-2 w-6 h-6 text-blue-500 fill-blue-500/10" />
            )}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Real-time command center
          </p>
        </div>
        {/* Actions */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <select
            value={selectedMonth || ""}
            onChange={(e) => setSelectedMonth(e.target.value || null)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black h-12"
          >
            <option value="">All Time</option>
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date();
              d.setDate(1); // Avoid end-of-month rollover (e.g. Mar 31 -> Feb 28/Mar 3)
              d.setMonth(d.getMonth() - i);
              const value = `${d.getFullYear()}-${d.getMonth()}`;
              const label = d.toLocaleDateString("default", {
                month: "short",
                year: "numeric",
              });
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })}
          </select>

          {/* The Big Switch */}
          <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 pr-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <div
              className={`h-3 w-3 rounded-full animate-pulse ${
                isLive ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-medium text-sm text-zinc-600 dark:text-zinc-300">
              Store is {isLive ? "OPEN" : "CLOSED"}
            </span>
            <button
              onClick={toggleStore}
              disabled={loading}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:focus:ring-zinc-50 ${
                isLive ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`${
                  isLive ? "translate-x-7" : "translate-x-1"
                } inline-block h-6 w-6 transform rounded-full bg-white transition-transform`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, i) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${metric.bg}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {metric.title}
              </h3>
              <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">
                {metric.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Action Area (Simulated Bento Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto md:h-96">
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black text-white rounded-3xl p-8 relative overflow-hidden group h-[500px] md:h-full">
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Live Orders</h3>
            <p className="text-zinc-400 mb-6">
              Real-time feed of incoming purchases.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
              {recentOrders.length === 0 ? (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
                  <span className="text-zinc-600">No active orders</span>
                </div>
              ) : (
                recentOrders.map((order, i) => (
                  <div
                    key={i}
                    className="bg-zinc-800/50 p-4 rounded-xl flex items-center justify-between backdrop-blur-sm border border-zinc-700/50"
                  >
                    <div>
                      <h4 className="font-bold">
                        {order.customerName || order.customerEmail}
                      </h4>
                      <p className="text-xs text-zinc-400">
                        {order.items ? order.items.length : 0} items •{" "}
                        {order.createdAt?.seconds
                          ? new Date(
                              order.createdAt.seconds * 1000
                            ).toLocaleTimeString()
                          : "Just now"}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-green-400">
                      GHS {order?.total?.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-800/50 group-hover:text-zinc-800/80 transition-colors pointer-events-none" />
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden h-[400px] md:h-full">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Inventory Status
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {products.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">No items.</p>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl"
                >
                  <span className="font-medium text-sm truncate max-w-[120px]">
                    {product.name}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      (product.stock || 0) < 10
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {product.stock || 0} left
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Link
              href="/admin/products"
              className="block w-full py-2 text-center text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Manage All Items →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
