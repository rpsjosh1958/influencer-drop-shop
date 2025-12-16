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
} from "lucide-react";

export default function AdminDashboard() {
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Real-time listener for System Config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "system", "config"), (doc) => {
      if (doc.exists()) {
        setIsLive(doc.data().isLive);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time listener for Metrics & Recent Orders
  useEffect(() => {
    // We fetch all orders for metrics, but we could optimize this with aggregation queries in production
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      let totalRev = 0;
      let count = 0;
      const recent: any[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "paid") {
          totalRev += data.total || 0;
          count++;
          // Take top 5 for display
          if (recent.length < 5) {
            recent.push({ id: doc.id, ...data });
          }
        }
      });
      setRevenue(totalRev);
      setOrdersCount(count);
      setRecentOrders(recent);
    });
    return () => unsub();
  }, []);

  // Real-time listener for Inventory Summary
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(items);
    });
    return () => unsub();
  }, []);

  const toggleStore = async () => {
    try {
      await updateDoc(doc(db, "system", "config"), {
        isLive: !isLive,
      });
    } catch (err) {
      console.error("Failed to toggle status", err);
    }
  };

  const metrics = [
    {
      title: "Total Revenue",
      value: `GHS ${revenue.toFixed(2)}`,
      icon: CreditCard,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Active Orders",
      value: ordersCount.toString(),
      icon: Activity,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Site Visitors",
      value: "1.2k", // Placeholder
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            War Room
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Real-time command center
          </p>
        </div>

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
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Today
              </span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-96">
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black text-white rounded-3xl p-8 relative overflow-hidden group">
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Live Orders</h3>
            <p className="text-zinc-400 mb-6">Real-time feed of incoming purchases.</p>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
              {recentOrders.length === 0 ? (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
                  <span className="text-zinc-600">No active orders</span>
                </div>
              ) : (
                recentOrders.map((order, i) => (
                  <div key={i} className="bg-zinc-800/50 p-4 rounded-xl flex items-center justify-between backdrop-blur-sm border border-zinc-700/50">
                    <div>
                      <h4 className="font-bold">{order.customerName || order.customerEmail}</h4>
                      <p className="text-xs text-zinc-400">{order.items.length} items • {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString() : 'Just now'}</p>
                    </div>
                    <span className="font-mono font-bold text-green-400">GHS {order.total.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-800/50 group-hover:text-zinc-800/80 transition-colors pointer-events-none" />
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden">
          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Inventory Status
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
             {products.length === 0 ? (
               <p className="text-zinc-500 text-center py-10">No items.</p>
             ) : (
               products.map(product => (
                 <div key={product.id} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                    <span className="font-medium text-sm truncate max-w-[120px]">{product.name}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      product.stock < 10 
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}>
                      {product.stock} left
                    </span>
                 </div>
               ))
             )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
             <Link href="/admin/products" className="block w-full py-2 text-center text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white transition-colors">
               Manage All Items →
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
