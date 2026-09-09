"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getCountFromServer,
  query,
  where,
  getDocs,
  collectionGroup,
  orderBy,
  limit,
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
import { toJsDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

// Orders in any of these statuses represent a real, uncancelled sale — used
// to sum gross revenue platform-wide. Doesn't subtract partial refunds
// (see functions/src/refunds.ts) since a partially-refunded order's status
// flips to "partially_refunded" and drops out of this list entirely,
// undercounting slightly rather than overcounting — acceptable precision
// for a dashboard summary, not exact accounting.
const REVENUE_STATUSES = [
  "paid",
  "processing",
  "packaged",
  "sent-out",
  "shipped",
  "delivered",
  "completed",
];

interface RecentActivity {
  id: string;
  message: string;
  createdAt: ReturnType<typeof toJsDate>;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeVendors: 0,
    totalRevenue: 0,
    activeTickets: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersSnap, vendorsSnap, ticketSnap, ordersSnap, recentStoresSnap] =
          await Promise.all([
            getCountFromServer(collection(db, "users")),
            getCountFromServer(collection(db, "stores")),
            getCountFromServer(
              query(collectionGroup(db, "tickets"), where("status", "==", "open"))
            ),
            getDocs(
              query(collectionGroup(db, "orders"), where("status", "in", REVENUE_STATUSES))
            ),
            getDocs(query(collection(db, "stores"), orderBy("createdAt", "desc"), limit(5))),
          ]);

        const totalRevenue = ordersSnap.docs.reduce(
          (sum, d) => sum + (d.data().total || 0),
          0
        );

        setStats({
          totalUsers: usersSnap.data().count,
          activeVendors: vendorsSnap.data().count,
          totalRevenue,
          activeTickets: ticketSnap.data().count,
        });

        setRecentActivity(
          recentStoresSnap.docs.map((d) => ({
            id: d.id,
            message: `New vendor "${d.data().name || d.id}" registered.`,
            createdAt: toJsDate(d.data().createdAt),
          }))
        );
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
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Active Vendors",
      value: stats.activeVendors,
      icon: Store,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
    {
      label: "Active Tickets",
      value: stats.activeTickets,
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

      {/* Charts / Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 min-h-[400px]">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-white">Revenue Trends</h3>
          </div>
          <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
            Coming soon — needs day-by-day revenue aggregation.
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-zinc-400" />
            <h3 className="font-bold text-white">Recently Registered Vendors</h3>
          </div>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-zinc-500">No vendors registered yet.</p>
            ) : (
              recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 items-start p-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 shrink-0" />
                  <div>
                    <p className="text-sm text-zinc-300">{item.message}</p>
                    <p className="text-xs text-zinc-500">
                      {item.createdAt?.toLocaleDateString() || "Unknown date"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
