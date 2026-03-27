"use client";

import { useEffect, useState, useMemo } from "react";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  orderBy,
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
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { AnalyticsModal } from "@/components/admin/analytics-modal";
import { HelpTrigger } from "@/context/onboarding-context";
import { formatCurrency, cn } from "@/lib/utils";

interface OrderData {
  id: string;
  total: number;
  status: string;
  customerName?: string;
  customerEmail?: string;
  items?: any[];
  createdAt?: any;
}

interface ProductData {
  id: string;
  name: string;
  stock: number;
  [key: string]: any;
}

interface BookingData {
  id: string;
  status: string;
  [key: string]: any;
}

interface ActivityItem {
  id: string;
  type: 'order' | 'booking';
  customerName?: string;
  customerEmail?: string;
  amount?: number;
  itemsCount?: number;
  serviceName?: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const { 
    storeId, 
    loading: storeLoading, 
    onboardingStatus, 
    onboardingNotes, 
    isSuspended 
  } = useAdminStore();
  const [storeName, setStoreName] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [storeType, setStoreType] = useState<"products" | "services" | "both">("both");
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [allOrders, setAllOrders] = useState<OrderData[]>([]);
  const [recentOrders, setRecentOrders] = useState<OrderData[]>([]);
  const [recentBookings, setRecentBookings] = useState<BookingData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeSalesIndex, setActiveSalesIndex] = useState(0);

  const onboardingBlocked = onboardingStatus !== "approved" || isSuspended;

  // Real-time listener for Store Config
  useEffect(() => {
    if (!storeId) return;

    const unsub = onSnapshot(doc(db, "stores", storeId), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setIsLive(data.status === "live");
        setStoreName(data.name);
        setIsVerified(!!data.isVerified);
        // Set store type flags
        setStoreType(data.storeType || 'both'); // Default to both if not set
      }
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

   // Real-time listener for Metrics & Recent Orders
   useEffect(() => {
     if (!storeId) return;

     const ordersQ = query(
       collection(db, "stores", storeId, "orders"),
       orderBy("createdAt", "desc")
     );
     const ordersUnsub = onSnapshot(ordersQ, (snapshot) => {
       let totalRev = 0;
       let ordersCount = 0;
       const recentOrders: any[] = [];
       const allOrders: any[] = [];

       snapshot.forEach((doc) => {
         const data = doc.data();
         const orderData = { id: doc.id, ...data } as OrderData;
         allOrders.push(orderData);

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
           let matchesMonth = true;
           if (selectedMonth && data.createdAt) {
             const date = data.createdAt.toDate();
             const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
             if (monthKey !== selectedMonth) matchesMonth = false;
           }

           if (matchesMonth) {
             totalRev += data.total || 0;
             ordersCount++;
           }
         }

         if (recentOrders.length < 5) {
           recentOrders.push(orderData);
         }
       });
       setRevenue(totalRev);
       setOrdersCount(ordersCount);
       setRecentOrders(recentOrders);
       setAllOrders(allOrders);
     });

     // Real-time listener for Bookings
     const bookingsQ = query(
       collection(db, "stores", storeId, "bookings"),
       orderBy("createdAt", "desc")
     );
     const bookingsUnsub = onSnapshot(bookingsQ, (snapshot) => {
       const recentBookings: any[] = [];
       let bookingsCount = 0;

       snapshot.forEach((doc) => {
         const data = doc.data();
         const bookingData = { id: doc.id, ...data } as BookingData;
         
         // Count bookings that are confirmed or pending (active bookings)
         if (["confirmed", "pending"].includes(data.status)) {
           bookingsCount++;
         }

         if (recentBookings.length < 5) {
           recentBookings.push(bookingData);
         }
       });
       setBookingsCount(bookingsCount);
       setRecentBookings(recentBookings);
     });

     return () => {
       ordersUnsub();
       bookingsUnsub();
     };
   }, [storeId, selectedMonth]);

  // Real-time listener for Inventory Summary
  useEffect(() => {
    if (!storeId) return;

    const q = query(
      collection(db, "stores", storeId, "products"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ProductData[];
      setProducts(items);
    });
    return () => unsub();
  }, [storeId]);

   // Bookings Listener
   useEffect(() => {
     if (!storeId) return;
     const q = query(collection(db, "stores", storeId, "bookings"), orderBy("createdAt", "desc"));
     const unsub = onSnapshot(q, (snapshot) => {
       setRecentBookings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as BookingData[]);
       // Update total bookings count
       setBookingsCount(snapshot.docs.length);
     });
     return () => unsub();
   }, [storeId]);

   // Insights Logic (Matching Mobile)
   const insights = useMemo(() => {
     const activeOrdersCount = allOrders.filter(o => ["paid", "processing", "packaged"].includes(o.status)).length;
     const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= 5).length;
     const pendingBookings = recentBookings.filter(b => b.status === "pending").length;
     const totalBookings = bookingsCount;

     // Top Product logic for all time
     const prodMap: Record<string, number> = {};
     allOrders.forEach(o => {
         o.items?.forEach((item: any) => {
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
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 10);
  }, [recentOrders, recentBookings]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveInsightIndex((prev) => (prev + 1) % insights.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [insights.length]);

  const toggleStore = async () => {
    if (!storeId || toggling || onboardingBlocked) return;
    setToggling(true);
    try {
      await updateDoc(doc(db, "stores", storeId), {
        status: isLive ? "maintenance" : "live",
      });
    } catch (err) {
      console.error("Failed to toggle status", err);
    } finally {
      setToggling(false);
    }
  };

  if (storeLoading || !storeId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      </div>
    );
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            {storeName || "Store"} 
            {isVerified && (
              <BadgeCheck className="w-6 h-6 text-blue-500 fill-blue-500/10" />
            )}
            <HelpTrigger category="dashboard" />
            {storeId && (
              <a
                href={`/shop/${storeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-black dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-500 bg-white dark:bg-zinc-900 ml-1"
              >
                <ExternalLink size={12} />
                <span>View Store</span>
              </a>
            )}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Real-time command center
          </p>
        </div>
        {/* Actions */}
        <div className="flex flex-row items-center gap-3">
          <select
            data-tour="dashboard-filter"
            value={selectedMonth || ""}
            onChange={(e) => setSelectedMonth(e.target.value || null)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-black h-12"
          >
            <option value="">All Time</option>
            {Array.from({ length: 12 }).map((_, i) => {
              const d = new Date();
              d.setDate(1);
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
          <div 
            data-tour="dashboard-status"
            className="flex items-center gap-4 bg-white dark:bg-zinc-900 p-2 pr-6 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 h-12"
          >
            <div
              className={`h-3 w-3 rounded-full animate-pulse ${
                isLive ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-bold text-xs text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">
              Store is {isLive ? "OPEN" : "CLOSED"}
            </span>
            <button
              onClick={toggleStore}
              disabled={loading || toggling || onboardingBlocked}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:focus:ring-zinc-50 ${
                isLive ? "bg-green-500" : "bg-zinc-200 dark:bg-zinc-700"
              } ${onboardingBlocked ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span
                className={`${
                  isLive ? "translate-x-7" : "translate-x-1"
                } inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-sm`}
              />
            </button>
          </div>
        </div>
      </div>

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-auto md:h-96">
         <div 
          data-tour="dashboard-activity"
          className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black text-white rounded-3xl p-8 relative overflow-hidden group h-[500px] md:h-full"
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
                        {activity.createdAt?.seconds
                          ? new Date(
                              activity.createdAt.seconds * 1000
                            ).toLocaleString(undefined, {
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

        <div 
          data-tour="dashboard-inventory"
          className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-8 flex flex-col relative overflow-hidden h-[400px] md:h-full"
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
     )}
