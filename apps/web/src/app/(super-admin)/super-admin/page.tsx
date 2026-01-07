"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
  getDocs,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  Store,
  DollarSign,
  Megaphone,
  TrendingUp,
  Activity,
} from "lucide-react";
import { motion } from "framer-motion";

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeVendors: 0,
    totalRevenue: 0, // Mocked for now, needs complex aggregation
    activeTickets: 0,
    recentLogs: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Parallel fetching
        const [usersSnap, vendorsSnap, ticketSnap] = await Promise.all([
          // Total Users (Assuming 'users' collection includes everyone)
          getCountFromServer(collection(db, "users")),
          // Active Vendors (Stores)
          getCountFromServer(collection(db, "stores")),
          // Active Tickets (Vendor + Platform)
          getCountFromServer(
            query(collectionGroup(db, "tickets"), where("status", "==", "open"))
          ),
        ]);

        setStats({
          totalUsers: usersSnap.data().count,
          activeVendors: vendorsSnap.data().count,
          totalRevenue: 154200.5, // TODO: Implement Revenue Aggregation
          activeTickets: ticketSnap.data().count,
          recentLogs: 0,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const metrics = [
    {
      label: "Total Revenue",
      value: `GHS ${stats.totalRevenue.toLocaleString()}`,
      change: "+12%",
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Active Vendors",
      value: stats.activeVendors,
      change: "+5",
      icon: Store,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Total Users",
      value: stats.totalUsers,
      change: "+24",
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Active Tickets",
      value: stats.activeTickets,
      change: "Needs Attention",
      icon: Megaphone,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
  ];

  if (loading) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-zinc-400 mt-2">Welcome back, System Owner.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-6 rounded-2xl border ${metric.border} bg-zinc-900/50 backdrop-blur-lg`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${metric.bg}`}>
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${metric.bg} ${metric.color}`}
              >
                {metric.change}
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="text-zinc-400 text-sm font-medium">
                {metric.label}
              </h3>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts / Activity Feed Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 min-h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-white">Revenue Trends</h3>
          </div>
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
            Chart Placeholder
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-white">Recent System Activity</h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex gap-3 items-start p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm text-zinc-300">
                    New vendor "Streetwear Co" registered.
                  </p>
                  <p className="text-xs text-zinc-500">2 mins ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
