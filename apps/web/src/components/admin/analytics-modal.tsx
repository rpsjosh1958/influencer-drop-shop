"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  Award,
} from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
  format,
  subDays,
  startOfWeek,
  isWithinInterval,
  startOfMonth,
  startOfYear,
  subMonths,
} from "date-fns";

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  products: any[];
  bookings: any[];
}

type TimeRange = "week" | "month" | "year" | "all";
type DataType = "revenue" | "orders";

export function AnalyticsModal({
  isOpen,
  onClose,
  orders,
  products,
  bookings,
}: AnalyticsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<TimeRange>("month");
  const [dataType, setDataType] = useState<DataType>("revenue");

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const formatMoney = (amount: number) =>
    `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 0 })}`;

  const parseDate = (createdAt: any) => {
    if (!createdAt) return new Date();
    if (createdAt.toDate) return createdAt.toDate();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
    return new Date(createdAt);
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    if (range === "week") start = startOfWeek(now);
    else if (range === "month") start = startOfMonth(now);
    else if (range === "year") start = startOfYear(now);
    else start = new Date(0);

    const filteredOrders = orders.filter((o) => {
      const date = parseDate(o.createdAt);
      return isWithinInterval(date, { start, end });
    });

    const filteredBookings = bookings.filter((b) => {
      const date = parseDate(b.createdAt);
      return isWithinInterval(date, { start, end });
    });

    return { orders: filteredOrders, bookings: filteredBookings };
  }, [orders, bookings, range]);

  const chartData = useMemo(() => {
    const data: any[] = [];
    const now = new Date();

    if (range === "week" || range === "month") {
      const days = range === "week" ? 7 : 30;
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(now, i);
        const dateStr = format(date, "yyyy-MM-dd");
        const label = format(date, "dd MMM");

        const periodOrders = filteredData.orders.filter(
          (o) => format(parseDate(o.createdAt), "yyyy-MM-dd") === dateStr
        );
        const val =
          dataType === "revenue"
            ? periodOrders.reduce((acc, o) => acc + (o.total || 0), 0)
            : periodOrders.length;

        data.push({ name: label, value: val });
      }
    } else {
      for (let i = 11; i >= 0; i--) {
        const date = subMonths(now, i);
        const month = date.getMonth();
        const year = date.getFullYear();
        const label = format(date, "MMM");

        const periodOrders = filteredData.orders.filter((o) => {
          const d = parseDate(o.createdAt);
          return d.getMonth() === month && d.getFullYear() === year;
        });

        const val =
          dataType === "revenue"
            ? periodOrders.reduce((acc, o) => acc + (o.total || 0), 0)
            : periodOrders.length;

        data.push({ name: label, value: val });
      }
    }
    return data;
  }, [filteredData, dataType, range]);

  const stats = useMemo(() => {
    const totalRev = filteredData.orders.reduce(
      (acc, o) => acc + (o.total || 0),
      0
    );
    const totalOrders = filteredData.orders.length;
    const totalBookings = filteredData.bookings.length;
    const uniqueCustomers = new Set(filteredData.orders.map((o) => o.customerId))
      .size;

    const prodMap: Record<string, number> = {};
    filteredData.orders.forEach((o) => {
      o.items?.forEach((item: any) => {
        prodMap[item.name] = (prodMap[item.name] || 0) + (item.quantity || 1);
      });
    });
    const topProducts = Object.entries(prodMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalRev,
      totalOrders,
      totalBookings,
      uniqueCustomers,
      topProducts,
    };
  }, [filteredData]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-zinc-950 w-full max-w-6xl max-h-[95vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800"
        >
          {/* Header */}
          <div className="px-10 py-8 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-50">
                Store Intelligence
              </h2>
              <p className="text-sm text-zinc-500 font-bold uppercase tracking-widest mt-1">
                Real-time business performance
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-8 justify-between items-start sm:items-center border-b border-zinc-100 dark:border-zinc-800 pb-6">
              <div className="flex gap-8">
                {(["week", "month", "year", "all"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className="relative group pb-2"
                  >
                    <span className={`text-sm font-black uppercase tracking-widest transition-all ${
                      range === r ? "text-black dark:text-white" : "text-zinc-300 hover:text-zinc-500"
                    }`}>
                      {r}
                    </span>
                    {range === r && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-black dark:bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-8">
                <button
                  onClick={() => setDataType("revenue")}
                  className="relative group pb-2"
                >
                  <span className={`text-sm font-black uppercase tracking-widest transition-all ${
                    dataType === "revenue" ? "text-black dark:text-white" : "text-zinc-300 hover:text-zinc-500"
                  }`}>
                    Revenue
                  </span>
                  {dataType === "revenue" && (
                    <motion.div layoutId="activeData" className="absolute bottom-0 left-0 right-0 h-1 bg-black dark:bg-white rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setDataType("orders")}
                  className="relative group pb-2"
                >
                  <span className={`text-sm font-black uppercase tracking-widest transition-all ${
                    dataType === "orders" ? "text-black dark:text-white" : "text-zinc-300 hover:text-zinc-500"
                  }`}>
                    Orders
                  </span>
                  {dataType === "orders" && (
                    <motion.div layoutId="activeData" className="absolute bottom-0 left-0 right-0 h-1 bg-black dark:bg-white rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  label: "Revenue",
                  value: formatMoney(stats.totalRev),
                  icon: TrendingUp,
                  color: "text-green-500",
                  bg: "bg-green-500/10",
                },
                {
                  label: "Orders",
                  value: stats.totalOrders,
                  icon: ShoppingBag,
                  color: "text-blue-500",
                  bg: "bg-blue-500/10",
                },
                {
                  label: "Bookings",
                  value: stats.totalBookings,
                  icon: Clock,
                  color: "text-purple-500",
                  bg: "bg-purple-500/10",
                },
                {
                  label: "Customers",
                  value: stats.uniqueCustomers,
                  icon: Users,
                  color: "text-orange-500",
                  bg: "bg-orange-500/10",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-6`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">
                    {stat.label}
                  </p>
                  <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                    {stat.value}
                  </h4>
                </div>
              ))}
            </div>

            {/* Chart Area - High Contrast Dark Mode for White Graphs */}
            <div className="bg-zinc-900 p-10 rounded-[3rem] border border-zinc-800 overflow-hidden shadow-inner relative">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {dataType === "revenue" ? (
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorWhite" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#71717a' }}
                        dy={15}
                      />
                      <YAxis
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#71717a' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "1.5rem",
                          border: "none",
                          backgroundColor: "#000",
                          boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.5)",
                          padding: "1rem",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={5}
                        fillOpacity={1}
                        fill="url(#colorWhite)"
                        animationDuration={1000}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#71717a' }}
                        dy={15}
                      />
                      <YAxis
                        axisLine={{ stroke: '#3f3f46' }}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 800, fill: '#71717a' }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "1.5rem",
                          border: "none",
                          backgroundColor: "#000",
                          color: "#fff"
                        }}
                        itemStyle={{ color: "#fff" }}
                      />
                      <Bar
                        dataKey="value"
                        fill="#fff"
                        radius={[10, 10, 0, 0]}
                        barSize={range === "week" ? 60 : 20}
                        animationDuration={1000}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="top" 
                          style={{ fill: '#fff', fontSize: 10, fontWeight: 900 }} 
                          offset={10}
                        />
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Popular Items */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Award className="w-6 h-6 text-black dark:text-white" />
                <h3 className="text-xl font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
                  Top Performing Products
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stats.topProducts.map(([name, count], i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 text-white rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-sm font-black group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                        {i + 1}
                      </div>
                      <span className="font-black text-sm text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">
                        {name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xl font-white text-white">{count}</span>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        Sold
                      </span>
                    </div>
                  </div>
                ))}
                {stats.topProducts.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-400 font-black uppercase tracking-[0.2em]">No sales data discovered</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
