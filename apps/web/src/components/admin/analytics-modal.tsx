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
  AreaChart,
  Area,
  BarChart,
  Bar,
  LabelList,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
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
import { formatCurrency } from "@/lib/utils";
import { Portal } from "@/components/ui/portal";

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  products: any[];
  bookings: any[];
}

type TimeRange = "week" | "month" | "year" | "all";
type DataType = "revenue" | "orders";

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

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

  const formatMoney = (amount: number) => formatCurrency(amount);

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
          className="bg-white dark:bg-zinc-950 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col border border-zinc-200 dark:border-zinc-800"
        >
          {/* Header */}
          <div className="px-8 py-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-50">
                Store Performance
              </h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                Real-time business performance
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex gap-6">
                {(["week", "month", "year", "all"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className="relative group pb-1"
                  >
                    <span className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                      range === r ? "text-black dark:text-white" : "text-zinc-300 hover:text-zinc-500"
                    }`}>
                      {r}
                    </span>
                    {range === r && (
                      <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-6">
                <button
                  onClick={() => setDataType("revenue")}
                  className="relative group pb-1"
                >
                  <span className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                    dataType === "revenue" ? "text-black dark:text-white" : "text-zinc-300 hover:text-zinc-500"
                  }`}>
                    Revenue
                  </span>
                  {dataType === "revenue" && (
                    <motion.div layoutId="activeData" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setDataType("orders")}
                  className="relative group pb-1"
                >
                  <span className={`text-[11px] font-black uppercase tracking-widest transition-all ${
                    dataType === "orders" ? "text-black dark:text-white" : "text-zinc-300 hover:text-zinc-500"
                  }`}>
                    Orders
                  </span>
                  {dataType === "orders" && (
                    <motion.div layoutId="activeData" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white rounded-full" />
                  )}
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  className="p-5 bg-zinc-50 dark:bg-zinc-900/50 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
                    {stat.label}
                  </p>
                  <h4 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
                    {stat.value}
                  </h4>
                </div>
              ))}
            </div>

            {/* Chart Area */}
            <div className="bg-zinc-950 p-6 rounded-[2rem] border border-zinc-800 overflow-hidden shadow-inner relative">
              <div className="h-[280px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  {dataType === "revenue" ? (
                    <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#3f3f46" strokeDasharray="4 4" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#71717a' }}
                        tickMargin={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#71717a' }}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent indicator="line" className="bg-black border-zinc-800 text-white" />} 
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#fff"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                        animationDuration={1500}
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ left: -20, right: 10, top: 20, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#3f3f46" strokeDasharray="4 4" opacity={0.5} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#71717a' }}
                        tickMargin={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fontWeight: 800, fill: '#71717a' }}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent indicator="dashed" className="bg-black border-zinc-800 text-white" />} 
                      />
                      <Bar
                        dataKey="value"
                        fill="#fff"
                        radius={[6, 6, 0, 0]}
                        barSize={range === "week" ? 40 : 15}
                        animationDuration={1500}
                      >
                        <LabelList 
                          dataKey="value" 
                          position="top" 
                          style={{ fill: '#fff', fontSize: 9, fontWeight: 900 }} 
                          offset={8}
                        />
                      </Bar>
                    </BarChart>
                  )}
                </ChartContainer>
              </div>
            </div>

            {/* Popular Items */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-black dark:text-white" />
                <h3 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-50">
                  Top Performing Products
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.topProducts.map(([name, count], i) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 text-white rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-black group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-colors">
                        {i + 1}
                      </div>
                      <span className="font-black text-xs text-zinc-900 dark:text-zinc-50 uppercase tracking-tighter">
                        {name}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-black text-zinc-900 dark:text-zinc-50">{count}</span>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        Sold
                      </span>
                    </div>
                  </div>
                ))}
                {stats.topProducts.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-zinc-50 dark:bg-zinc-900/50 rounded-[2rem] border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-zinc-400 font-black uppercase tracking-[0.2em] text-[10px]">No sales data discovered</p>
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
