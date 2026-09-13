"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CreditCard,
  Package,
  Zap,
  BadgeCheck,
  ChevronRight,
  AlertTriangle,
  Calendar,
  BarChart3,
  ShoppingBag,
  Award,
  TrendingUp,
  Sparkles,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { AnalyticsModal } from "@/components/admin/analytics-modal";
import {
  AdminPageHeader,
  getPresetRange,
  type DateRangeValue,
} from "@/components/admin/admin-page-header";
import { HelpTrigger } from "@/context/onboarding-context";
import { LoadingState } from "@/components/admin/loading-state";
import { formatCurrency, cn, toJsDate, getTimestampSeconds } from "@/lib/utils";
import type { OrderItem, FirestoreTimestampLike, Product } from "@/types";

interface OrderData {
  id: string;
  total: number;
  status: string;
  customerName?: string;
  customerEmail?: string;
  items?: OrderItem[];
  createdAt?: FirestoreTimestampLike;
}

interface ProductData {
  id: string;
  name: string;
  stock: number;
}

interface BookingData {
  id: string;
  status: string;
  customerName?: string;
  customerEmail?: string;
  // Legacy fallback fields — some older booking docs used these instead
  // of customerName/customerEmail.
  name?: string;
  email?: string;
  serviceName?: string;
  date?: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  createdAt?: FirestoreTimestampLike;
}

interface ComplaintData {
  id: string;
  status: "unread" | "read" | "resolved";
  subject?: string;
  customerName?: string;
  createdAt?: FirestoreTimestampLike;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'booking';
  customerName?: string;
  customerEmail?: string;
  amount?: number;
  itemsCount?: number;
  serviceName?: string;
  createdAt?: FirestoreTimestampLike;
}

export default function AdminDashboard() {
  const {
    storeId,
    loading: storeLoading,
    onboardingStatus,
    onboardingNotes,
    isSuspended,
    userPlan,
  } = useAdminStore();
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    getPresetRange("30d"),
  );
  const [activeSalesIndex, setActiveSalesIndex] = useState(0);

  const onboardingBlocked = onboardingStatus !== "approved" || isSuspended;

  // Store config
  const { data: storeData } = useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      if (!storeId) return null;
      const snap = await getDoc(doc(db, "stores", storeId));
      return snap.exists() ? snap.data() : null;
    },
    enabled: !!storeId,
  });

  const storeName = storeData?.name || "";
  // Real field is `type` ("product"|"service"|"hybrid") — `storeType`
  // is never actually set anywhere, so this always silently fell back
  // to "both" before, and the Sales-vs-Bookings toggle never
  // correctly reflected a product-only or service-only store.
  const storeType = useMemo(() => {
    const typeMap: Record<string, "products" | "services" | "both"> = {
      product: "products",
      service: "services",
      hybrid: "both",
    };
    return typeMap[storeData?.type] || "both";
  }, [storeData?.type]);

  // Orders
  const { data: allOrders = [] } = useQuery({
    queryKey: ["orders", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const q = query(
        collection(db, "stores", storeId, "orders"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as OrderData[];
    },
    enabled: !!storeId,
  });

  const { revenue, ordersCount, recentOrders } = useMemo(() => {
    let totalRev = 0;
    let count = 0;
    const recent: OrderData[] = [];

    allOrders.forEach((data) => {
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
        let matchesRange = true;
        const date = toJsDate(data.createdAt);
        if (date && (date < dateRange.from || date > dateRange.to)) {
          matchesRange = false;
        }

        if (matchesRange) {
          totalRev += data.total || 0;
          count++;
        }
      }

      if (recent.length < 5) {
        recent.push(data);
      }
    });

    return { revenue: totalRev, ordersCount: count, recentOrders: recent };
  }, [allOrders, dateRange]);

  // Bookings
  const { data: allBookings = [] } = useQuery({
    queryKey: ["bookings", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const q = query(
        collection(db, "stores", storeId, "bookings"),
        orderBy("date", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as BookingData[];
    },
    enabled: !!storeId,
  });

  const { bookingsCount, recentBookings } = useMemo(() => {
    const sorted = [...allBookings].sort(
      (a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt),
    );
    let count = 0;
    const recent: BookingData[] = [];

    sorted.forEach((data) => {
      // Count bookings that are confirmed or pending (active bookings)
      if (["confirmed", "pending"].includes(data.status)) {
        count++;
      }
      if (recent.length < 5) {
        recent.push(data);
      }
    });

    return { bookingsCount: count, recentBookings: recent };
  }, [allBookings]);

  // Inventory summary
  const { data: products = [] } = useQuery({
    queryKey: ["products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const q = query(
        collection(db, "stores", storeId, "products"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ProductData[];
    },
    enabled: !!storeId,
  });

  // Open complaints — for the "Needs you today" queue. "Unread" is the
  // only status the Complaints page itself treats as needing attention
  // (its mutation only ever sets "resolved", never "read").
  //
  // Single-field where() only, no orderBy — combining an equality filter
  // with orderBy on a different field needs a composite index that
  // doesn't exist here, which fails silently (FAILED_PRECONDITION,
  // swallowed since there's no onError), so this used to just show
  // nothing. Sort client-side instead.
  const { data: openComplaints = [] } = useQuery({
    queryKey: ["complaints_unread", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const q = query(
        collection(db, "stores", storeId, "complaints"),
        where("status", "==", "unread"),
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ComplaintData[];
      return docs.sort(
        (a, b) => getTimestampSeconds(a.createdAt) - getTimestampSeconds(b.createdAt),
      );
    },
    enabled: !!storeId,
  });

   // Insights Logic (Matching Mobile)
   const insights = useMemo(() => {
     const activeOrdersCount = allOrders.filter(o => ["paid", "processing", "packaged"].includes(o.status)).length;
     const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
     const pendingBookings = recentBookings.filter(b => b.status === "pending").length;
     const totalBookings = bookingsCount;

     // Top Product logic for all time
     const prodMap: Record<string, number> = {};
     allOrders.forEach(o => {
         o.items?.forEach((item: OrderItem) => {
             prodMap[item.name] = (prodMap[item.name] || 0) + (item.quantity || 1);
         });
     });
     const topProduct = Object.entries(prodMap).sort((a,b) => b[1] - a[1])[0];

     const list = [
       {
         label: "Total Sales",
         value: allOrders.length.toString(),
         icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
         color: "text-blue-600",
       },
       {
         label: "Active Orders",
         value: activeOrdersCount.toString(),
         icon: <ShoppingBag className="w-4 h-4 text-blue-500" />,
         color: "text-blue-600",
       },
     ];

     if (topProduct) {
         list.push({
             label: "Popular Item",
             value: topProduct[0],
             icon: <Award className="w-4 h-4 text-green-500" />,
             color: "text-green-600",
         });
     }

     if (lowStockCount > 0) {
       list.push({
         label: "Low Stock",
         value: `${lowStockCount} Items`,
         icon: <AlertTriangle className="w-4 h-4 text-orange-500" />,
         color: "text-orange-600",
       });
     }

     if (pendingBookings > 0) {
       list.push({
         label: "New Bookings",
         value: pendingBookings.toString(),
         icon: <Calendar className="w-4 h-4 text-purple-500" />,
         color: "text-purple-600",
       });
     }

     return list;
   }, [allOrders, products, recentBookings, bookingsCount]);

   // "Needs you today" — a short, clickable action queue. Each row only
   // appears if its count is > 0; if everything's empty the card shows a
   // plain "caught up" state instead of four zeroes.
   const needsAttention = useMemo(() => {
     const rows: {
       key: string;
       count: number;
       title: string;
       detail: string;
       href: string;
       icon: React.ReactNode;
     }[] = [];

     // Orders to pack — paid but not yet packaged/shipped.
     const toPack = allOrders.filter((o) => o.status === "paid");
     if (toPack.length > 0) {
       const oldest = toPack.reduce((a, b) =>
         getTimestampSeconds(a.createdAt) < getTimestampSeconds(b.createdAt) ? a : b,
       );
       const oldestDate = toJsDate(oldest.createdAt);
       const daysAgo = oldestDate
         ? Math.max(0, Math.floor((Date.now() - oldestDate.getTime()) / 86400000))
         : null;
       const heldAmount = toPack.reduce((sum, o) => sum + (o.total || 0), 0);
       rows.push({
         key: "orders",
         count: toPack.length,
         title: "Orders to pack",
         detail:
           (daysAgo === null
             ? "Oldest paid order is unpacked"
             : daysAgo === 0
               ? "Oldest paid today"
               : `Oldest paid ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`) +
           ` · ${formatCurrency(heldAmount)} held`,
         href: "/admin/orders",
         icon: <ShoppingBag size={18} />,
       });
     }

     // Bookings waiting on vendor confirmation.
     const toConfirm = allBookings.filter((b) => b.status === "pending");
     if (toConfirm.length > 0) {
       const parseSlot = (b: BookingData) =>
         b.date ? new Date(`${b.date}T${b.startTime || "00:00"}:00`) : null;
       const now = new Date();
       const withSlot = toConfirm
         .map((b) => ({ b, slot: parseSlot(b) }))
         .filter((x): x is { b: BookingData; slot: Date } => !!x.slot);
       const upcoming = withSlot.filter((x) => x.slot >= now);
       const next = (upcoming.length > 0 ? upcoming : withSlot).sort(
         (a, b) => a.slot.getTime() - b.slot.getTime(),
       )[0];

       let detail = "Check the schedule for details";
       if (next) {
         const dayMs = 86400000;
         const startOfDay = (d: Date) =>
           new Date(d.getFullYear(), d.getMonth(), d.getDate());
         const diffDays = Math.round(
           (startOfDay(next.slot).getTime() - startOfDay(now).getTime()) / dayMs,
         );
         const dayLabel =
           diffDays === 0
             ? "today"
             : diffDays === 1
               ? "tomorrow"
               : next.slot.toLocaleDateString(undefined, { weekday: "short" });
         detail = `Next slot is ${dayLabel} ${next.b.startTime || ""}`.trim();
       }

       rows.push({
         key: "bookings",
         count: toConfirm.length,
         title: "Bookings to confirm",
         detail,
         href: "/admin/bookings",
         icon: <Calendar size={18} />,
       });
     }

     // Items nearly out of stock (same threshold the Insights card uses).
     const lowStock = products
       .filter((p) => p.stock > 0 && p.stock <= 5)
       .sort((a, b) => a.stock - b.stock);
     if (lowStock.length > 0) {
       rows.push({
         key: "stock",
         count: lowStock.length,
         title: "Items nearly out",
         detail: `${lowStock[0].name} down to ${lowStock[0].stock}`,
         href: "/admin/products",
         icon: <AlertTriangle size={18} />,
       });
     }

     // Open (unread) complaints.
     if (openComplaints.length > 0) {
       const oldest = openComplaints[0];
       rows.push({
         key: "complaints",
         count: openComplaints.length,
         title: openComplaints.length === 1 ? "Complaint open" : "Complaints open",
         detail: [oldest.subject, oldest.customerName].filter(Boolean).join(" · ") ||
           "Opened by a customer",
         href: "/admin/complaints",
         icon: <MessageCircle size={18} />,
       });
     }

     return rows;
   }, [allOrders, allBookings, products, openComplaints]);

   const salesViews = useMemo(
     () => {
       if (storeType === "products") {
         return [
           {
             label: "Total Sales",
             value: ordersCount.toString(),
             icon: <ShoppingBag className="w-4 h-4 text-blue-500" />,
             color: "text-blue-600",
           },
         ];
       }

       if (storeType === "services") {
         return [
           {
             label: "Total Bookings",
             value: bookingsCount.toString(),
             icon: <Calendar className="w-4 h-4 text-purple-500" />,
             color: "text-purple-600",
           },
         ];
       }

       if (storeType === "both") {
         return [
           {
             label: "Total Sales",
             value: ordersCount.toString(),
             icon: <ShoppingBag className="w-4 h-4 text-blue-500" />,
             color: "text-blue-600",
           },
           {
             label: "Total Bookings",
             value: bookingsCount.toString(),
             icon: <Calendar className="w-4 h-4 text-purple-500" />,
             color: "text-purple-600",
           },
         ];
       }

       // Fallback if storeType is something unexpected
       return [
         {
           label: "Total Activity",
           value: (ordersCount + bookingsCount).toString(),
           icon: <Activity className="w-4 h-4 text-zinc-500" />,
           color: "text-zinc-600",
         },
       ];
     },
     [storeType, ordersCount, bookingsCount],
   );

  useEffect(() => {
    if (salesViews.length <= 1) {
      setActiveSalesIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setActiveSalesIndex((prev) => (prev + 1) % salesViews.length);
    }, 3000); // 3s, same cadence as analytics
    return () => clearInterval(timer);
  }, [salesViews.length]);

   const recentActivity = useMemo<ActivityItem[]>(() => {
    const mappedOrders: ActivityItem[] = recentOrders.map((order) => ({
      id: order.id,
      type: 'order',
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      amount: order.total,
      itemsCount: order.items?.length || 0,
      createdAt: order.createdAt,
    }));

    const mappedBookings: ActivityItem[] = recentBookings.map((booking) => ({
      id: booking.id,
      type: 'booking',
      customerName: booking.customerName || booking.name, // Adjust fallback fields if needed
      customerEmail: booking.customerEmail || booking.email,
      serviceName: booking.serviceName,
      createdAt: booking.createdAt,
    }));

    return [...mappedOrders, ...mappedBookings]
      .sort((a, b) => getTimestampSeconds(b.createdAt) - getTimestampSeconds(a.createdAt))
      .slice(0, 10);
  }, [recentOrders, recentBookings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveInsightIndex((prev) => (prev + 1) % insights.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [insights.length]);

  if (storeLoading || !storeId) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-8">
      {/* Onboarding / Suspension Banner */}
      {onboardingBlocked && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm",
            isSuspended 
              ? "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400"
              : onboardingStatus === "rejected"
              ? "bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-900/30 dark:text-red-400"
              : onboardingStatus === "needs_more_info"
              ? "bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-900/30 dark:text-amber-400"
              : "bg-blue-50 border-blue-100 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/30 dark:text-blue-400"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl shrink-0",
              isSuspended || onboardingStatus === "rejected" ? "bg-red-100 dark:bg-red-900/40" : 
              onboardingStatus === "needs_more_info" ? "bg-amber-100 dark:bg-amber-900/40" : "bg-blue-100 dark:bg-blue-900/40"
            )}>
              {isSuspended || onboardingStatus === "rejected" ? <AlertTriangle size={20} /> : 
               onboardingStatus === "needs_more_info" ? <Sparkles size={20} /> : <Zap size={20} />}
            </div>
            <div>
              <h4 className="font-bold text-sm uppercase tracking-tight">
                {isSuspended ? "Store Suspended" : 
                 onboardingStatus === "pending" ? "Onboarding in Progress" : 
                 onboardingStatus === "needs_more_info" ? "Action Required" : 
                 "Application Rejected"}
              </h4>
              <p className="text-xs font-medium opacity-90">
                {isSuspended ? "Your store has been suspended by an administrator. Please contact support." :
                 onboardingStatus === "pending" ? "Your store is currently under review. You'll be notified once approved." :
                 onboardingStatus === "needs_more_info" ? (onboardingNotes || "We need a bit more information to approve your store.") :
                 (onboardingNotes || "Your store application was not approved. Contact support for details.")}
              </p>
            </div>
          </div>
          {onboardingStatus === "needs_more_info" && (
            <a 
              href="/admin/settings"
              className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shrink-0"
            >
              Update Details
            </a>
          )}
        </motion.div>
      )}

      {/* Header */}
      <AdminPageHeader
        title={
          <>
            {storeName || "Store"}
            {userPlan === "growth" && (
              <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500/10" />
            )}
            <HelpTrigger category="dashboard" />
          </>
        }
        subtitle="Real-time command center"
        showDateFilter
        onDateRangeChange={setDateRange}
      />

       {/* Metrics Grid */}
       <div 
         data-tour="dashboard-metrics"
         className="grid grid-cols-1 md:grid-cols-3 gap-6"
       >
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
         >
           <div className="flex items-center justify-between">
             <div className={`p-3 rounded-2xl bg-green-500/10`}>
               <CreditCard className={`w-6 h-6 text-green-500`} />
             </div>
           </div>
           <div className="mt-4">
             <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
               Total Revenue
             </h3>
             <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-1">
               {formatCurrency(revenue)}
             </p>
           </div>
         </motion.div>

        {/* Dynamic Total Sales / Bookings card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden h-44 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="p-3 rounded-2xl bg-blue-500/10">
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
          </div>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSalesIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 truncate pr-8">
                  {salesViews[activeSalesIndex]?.value ?? "0"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {salesViews[activeSalesIndex]?.icon}
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      salesViews[activeSalesIndex]?.color ?? "text-zinc-500"
                    }`}
                  >
                    {salesViews[activeSalesIndex]?.label ?? "Total Sales"}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {salesViews.length > 1 && (
            <div className="flex gap-1 absolute bottom-6 right-6">
              {salesViews.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    activeSalesIndex === i
                      ? "w-4 bg-black dark:bg-white"
                      : "w-1 bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>

         {/* Dynamic Insights Card (Still Card 3) */}
         <motion.div
           data-tour="dashboard-analytics"
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           onClick={() => setShowAnalytics(true)}
           className="p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden h-44 flex flex-col justify-between"
         >
           <div className="flex items-center justify-between mb-4">
             <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl">
               <BarChart3 className="w-6 h-6 text-zinc-900 dark:text-white" />
             </div>
             <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
           </div>
           
           <div>
             <AnimatePresence mode="wait">
               <motion.div
                 key={activeInsightIndex}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 transition={{ duration: 0.3 }}
               >
                 <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 truncate pr-8">
                   {insights[activeInsightIndex].value}
                 </p>
                 <div className="flex items-center gap-2 mt-1">
                   {insights[activeInsightIndex].icon}
                   <span className={`text-[10px] font-black uppercase tracking-widest ${insights[activeInsightIndex].color}`}>
                     {insights[activeInsightIndex].label}
                   </span>
                 </div>
               </motion.div>
             </AnimatePresence>
           </div>

           <div className="flex gap-1 absolute bottom-6 right-6">
             {insights.map((_, i) => (
               <div 
                 key={i} 
                 className={`h-1 rounded-full transition-all duration-300 ${activeInsightIndex === i ? 'w-4 bg-black dark:bg-white' : 'w-1 bg-zinc-200 dark:bg-zinc-800'}`} 
               />
             ))}
           </div>
         </motion.div>
       </div>

       <AnalyticsModal
         isOpen={showAnalytics}
         onClose={() => setShowAnalytics(false)}
         orders={allOrders}
         products={products}
         bookings={recentBookings}
       />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-auto lg:h-[640px]">
         <div
          data-tour="dashboard-activity"
          className="bg-gradient-to-br from-zinc-900 to-black text-white rounded-3xl p-8 relative overflow-hidden group h-[500px] lg:h-full"
        >
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="text-2xl font-bold mb-2 uppercase tracking-tight">Store Activity</h3>
            <p className="text-zinc-400 mb-6 font-medium">
              Real-time feed of incoming orders and bookings.
            </p>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-zinc-700">
              {recentActivity.length === 0 ? (
                <div className="h-full flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
                  <span className="text-zinc-600 font-black uppercase tracking-widest text-xs">No recent activity</span>
                </div>
              ) : (
                recentActivity.map((activity, i) => (
                  <div
                    key={`${activity.id}-${i}`}
                    className="bg-zinc-800/50 p-4 rounded-2xl flex items-center justify-between backdrop-blur-sm border border-zinc-700/50"
                  >
                    <div>
                      <h4 className="font-bold">
                        {activity.customerName || activity.customerEmail || 'Guest'}
                      </h4>
                      <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
                        {activity.type === 'order' 
                          ? `${activity.itemsCount || 0} items` 
                          : activity.serviceName || 'Service Booking'}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {toJsDate(activity.createdAt)
                          ? toJsDate(activity.createdAt)!.toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "Just now"}
                      </p>
                    </div>
                    <span className="font-black text-green-400 tracking-tighter">
                      {activity.type === 'order'
                        ? formatCurrency(activity.amount ?? 0)
                        : 'Booking'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <Zap className="absolute -bottom-10 -right-10 w-64 h-64 text-zinc-800/50 group-hover:text-zinc-800/80 transition-colors pointer-events-none" />
        </div>

        <div className="flex flex-col gap-6 h-auto lg:h-full min-h-0">
          {/* Needs You Today */}
          <div
            data-tour="dashboard-needs-attention"
            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 flex flex-col shrink-0 max-h-[300px]"
          >
            <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-50 mb-4 uppercase tracking-tight shrink-0">
              Needs You Today
            </h3>
            {needsAttention.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-zinc-500 font-bold text-sm">
                  You&apos;re all caught up 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto pr-1">
                {needsAttention.map((row) => (
                  <Link
                    key={row.key}
                    href={row.href}
                    className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors group"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                      {row.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                          {row.title}
                        </span>
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900">
                          {row.count}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {row.detail}
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      className="shrink-0 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors"
                    />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Inventory Status */}
          <div
            data-tour="dashboard-inventory"
            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden flex-1 min-h-[300px] lg:min-h-0"
          >
            <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2 uppercase tracking-tight">
              <Package className="w-5 h-5 text-blue-500" />
              Inventory Status
            </h3>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {products.length === 0 ? (
                <p className="text-zinc-500 text-center py-10 font-bold uppercase text-xs tracking-widest">No items.</p>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                  >
                    <span className="font-bold text-sm truncate max-w-[120px] uppercase tracking-tight">
                      {product.name}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${
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
              <a
                href="/admin/products"
                className="block w-full py-2 text-center text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black dark:text-zinc-50 dark:hover:text-white transition-colors"
                >
                  Manage All Items →
                </a>
              </div>
             </div>
           </div>
       </div>
    </div>
  );
}
