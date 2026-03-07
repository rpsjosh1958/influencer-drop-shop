import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendor } from "@/context/vendor-context";
import { H1, P, H2 } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import {
  CreditCard,
  ShoppingBag,
  Package,
  Menu,
  TrendingUp,
  BadgeCheck,
  Calendar,
  Briefcase,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Award,
} from "lucide-react-native";
import { MotiView, AnimatePresence } from "moti";
import { useState, useMemo, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { VendorOrderDetails } from "@/components/vendor/vendor-order-details";
import { VendorBookingDetails } from "@/components/vendor/vendor-booking-details";
import { AnalyticsModal } from "@/components/vendor/analytics-modal";

export default function VendorDashboard() {
  const { store, metrics, loading, toggleStoreStatus, orders, bookings } =
    useVendor();
  const [toggling, setToggling] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);
  const navigation = useNavigation();

  const formatMoney = (amount: number) =>
    `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

  const handleToggleStatus = async () => {
    setToggling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await toggleStoreStatus();
    } catch (e) {
      // handled
    } finally {
      setToggling(false);
    }
  };

  // Rotating Insights Logic
  const insights = useMemo(() => {
    // Top Product logic for all time
    const prodMap: Record<string, number> = {};
    orders.forEach(o => {
        o.items?.forEach((item: any) => {
            prodMap[item.name] = (prodMap[item.name] || 0) + (item.quantity || 1);
        });
    });
    const topProduct = Object.entries(prodMap).sort((a,b) => b[1] - a[1])[0];

    const list = [
      {
        label: "Total Sales",
        value: metrics.totalOrders.toString(),
        icon: <TrendingUp size={12} color="#3b82f6" />,
        color: "text-blue-600",
      },
      {
        label: "Active Orders",
        value: metrics.activeOrders.toString(),
        icon: <ShoppingBag size={12} color="#3b82f6" />,
        color: "text-blue-600",
      },
    ];

    if (topProduct) {
        list.push({
            label: "Popular Item",
            value: topProduct[0],
            icon: <Award size={12} color="#16a34a" />,
            color: "text-green-600",
        });
    }

    if (metrics.lowStockCount > 0) {
      list.push({
        label: "Low Stock",
        value: `${metrics.lowStockCount} Items`,
        icon: <AlertTriangle size={12} color="#f59e0b" />,
        color: "text-orange-600",
      });
    }

    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    if (pendingBookings > 0) {
      list.push({
        label: "New Bookings",
        value: pendingBookings.toString(),
        icon: <Calendar size={12} color="#8b5cf6" />,
        color: "text-purple-600",
      });
    }

    return list;
  }, [metrics, bookings, orders]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveInsightIndex((prev) => (prev + 1) % insights.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [insights.length]);

  // Merge & Sort Activity
  const liveActivity = useMemo(() => {
    const combined = [
      ...orders.map((o) => ({ ...o, _type: "order" })),
      ...bookings.map((b) => ({ ...b, _type: "booking" })),
    ];
    // Sort by createdAt desc
    return combined
      .sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      })
      .slice(0, 10); // Limit to 10
  }, [orders, bookings]);

  if (loading && !store) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  const isLive = store?.status === "live";
  const isVerified = store?.plan === "growth";

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between bg-white z-10">
        <View className="flex-row items-center gap-3 flex-1 pr-4">
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Menu size={24} color="black" />
          </Pressable>
          <View className="flex-1">
            <View className="flex-row items-center gap-1">
              <H1
                className="text-xl font-black uppercase"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {store?.name || "Dashboard"}
              </H1>
              {isVerified && (
                <BadgeCheck size={18} color="#2563eb" fill="white" />
              )}
            </View>
            <View className="flex-row items-center gap-2">
              <View className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500' : 'bg-zinc-300'}`} />
              <P className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                {isLive ? 'Accepting Orders' : 'Store Closed'}
              </P>
            </View>
          </View>
        </View>

        {/* Profile/Logo Placeholder */}
        <View className="w-10 h-10 rounded-full bg-zinc-100 items-center justify-center overflow-hidden border border-zinc-200">
          {store?.logo ? (
            <Image source={{ uri: store.logo }} className="w-full h-full" />
          ) : (
            <P className="font-black text-xs">{store?.name?.[0]}</P>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-zinc-50"
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Metric Cards */}
        <View className="flex-row flex-wrap gap-4 mb-8">
          {/* Revenue */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <View className="bg-black p-6 rounded-3xl shadow-sm">
              <View className="flex-row justify-between items-start mb-4">
                <View className="p-3 bg-zinc-800 rounded-2xl">
                  <CreditCard color="white" size={24} />
                </View>
                <View className="bg-zinc-800 px-3 py-1 rounded-full">
                  <P className="text-zinc-400 text-xs font-bold uppercase">
                    This Month
                  </P>
                </View>
              </View>
              <P className="text-zinc-400 font-medium mb-1">Total Revenue</P>
              <H1 className="text-4xl text-white font-black tracking-tight">
                {formatMoney(metrics.revenue)}
              </H1>
            </View>
          </MotiView>

          {/* Row 2 */}
          <View className="flex-row gap-4 w-full h-40">
            {/* Dynamic Insights Card */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAnalytics(true);
              }}
              className="flex-1 p-5 rounded-3xl border border-zinc-100 bg-white shadow-sm justify-between overflow-hidden"
            >
              <View className="flex-row justify-between items-center">
                <View className="w-10 h-10 bg-zinc-50 rounded-full items-center justify-center">
                  <BarChart3 color="black" size={20} />
                </View>
                <ChevronRight size={16} color="#d4d4d8" />
              </View>

              <View>
                <AnimatePresence mode="wait">
                  <MotiView
                    key={activeInsightIndex}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    exit={{ opacity: 0, translateY: -10 }}
                    transition={{ type: 'timing', duration: 400 }}
                  >
                    <H1 className="text-2xl font-black" numberOfLines={1} ellipsizeMode="tail">
                      {insights[activeInsightIndex].value}
                    </H1>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      {insights[activeInsightIndex].icon}
                      <P className={`text-[10px] font-black uppercase ${insights[activeInsightIndex].color}`}>
                        {insights[activeInsightIndex].label}
                      </P>
                    </View>
                  </MotiView>
                </AnimatePresence>
              </View>
              
              {/* Progress dots */}
              <View className="flex-row gap-1 absolute bottom-4 right-5">
                {insights.map((_, i) => (
                  <View 
                    key={i} 
                    className={`h-1 rounded-full ${activeInsightIndex === i ? 'w-3 bg-black' : 'w-1 bg-zinc-200'}`} 
                  />
                ))}
              </View>
            </Pressable>

            {/* Store Toggle Card (Replacing Total Sales) */}
            <Pressable
              onPress={handleToggleStatus}
              disabled={toggling}
              className={`flex-1 p-5 rounded-3xl border shadow-sm justify-between ${
                isLive
                  ? "bg-green-50 border-green-200"
                  : "bg-white border-zinc-100"
              }`}
            >
              <View className="flex-row justify-between w-full">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isLive ? "bg-green-200" : "bg-zinc-100"
                  }`}
                >
                  <View
                    className={`w-4 h-4 rounded-full ${
                      isLive ? "bg-green-600" : "bg-zinc-400"
                    }`}
                  />
                </View>
              </View>
              <View>
                <H1
                  className={`text-xl font-black ${
                    isLive ? "text-green-800" : "text-zinc-800"
                  }`}
                >
                  {isLive ? "Store Open" : "Store Closed"}
                </H1>
                <P
                  className={`text-xs font-bold uppercase mt-1 ${
                    isLive ? "text-green-600" : "text-zinc-400"
                  }`}
                >
                  {toggling ? "Updating..." : "Tap to Toggle"}
                </P>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Live Activity Feed */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <H2 className="text-lg font-black uppercase">Live Activity</H2>
            <P className="text-zinc-400 font-bold text-xs uppercase animate-pulse">
              Real-time
            </P>
          </View>

          {liveActivity.length === 0 ? (
            <View className="bg-white p-8 rounded-2xl border border-dashed border-zinc-300 items-center">
              <P className="text-zinc-400 font-bold">No recent activity</P>
            </View>
          ) : (
            <View className="space-y-3">
              {liveActivity.map((item) => {
                const isOrder = item._type === "order";

                // Status Colors Logic
                let statusBg = "bg-zinc-100";
                let statusText = "text-zinc-500";

                if (
                  item.status === "paid" ||
                  item.status === "completed" ||
                  item.status === "confirmed"
                ) {
                  statusBg = "bg-green-100";
                  statusText = "text-green-700";
                } else if (
                  item.status === "processing" ||
                  item.status === "shipped" ||
                  item.status === "sent-out"
                ) {
                  statusBg = "bg-blue-100";
                  statusText = "text-blue-700";
                } else if (
                  item.status === "cancelled" ||
                  item.status === "no-show"
                ) {
                  statusBg = "bg-red-100";
                  statusText = "text-red-700";
                }

                return (
                  <Pressable
                    key={`${item._type}-${item.id}`}
                    onPress={() =>
                      isOrder
                        ? setSelectedOrder(item)
                        : setSelectedBooking(item)
                    }
                    className="bg-white p-4 mb-4 rounded-2xl border border-zinc-100 flex-row items-center justify-between active:scale-[0.98] transition-all shadow-sm"
                  >
                    <View className="flex-row items-center gap-4">
                      <View
                        className={`w-12 h-12 rounded-2xl items-center justify-center border ${
                          isOrder
                            ? "bg-orange-50 border-orange-100"
                            : "bg-purple-50 border-purple-100"
                        }`}
                      >
                        {isOrder ? (
                          <Package size={20} color="#ea580c" />
                        ) : (
                          <Briefcase size={20} color="#9333ea" />
                        )}
                      </View>
                      <View>
                        <P className="font-bold text-base">
                          {item.customerName || "Customer"}
                        </P>
                        <View className="flex-row items-center gap-2">
                          <P className="text-xs text-zinc-400 font-bold uppercase">
                            {isOrder
                              ? `Order #${item.id.slice(0, 4)}`
                              : `${item.serviceName || "Booking"}`}
                          </P>
                          <P className="text-xs text-zinc-300 font-black">•</P>
                          <P className="text-xs text-zinc-400 font-medium">
                            {new Date(
                              item.createdAt?.seconds * 1000
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </P>
                        </View>
                      </View>
                    </View>
                    <View className="items-end">
                      <P className="font-bold text-base">
                        {formatMoney(
                          (isOrder ? item.total : item.servicePrice) || 0
                        )}
                      </P>
                      <View
                        className={`px-2 py-0.5 rounded-md mt-1 ${statusBg}`}
                      >
                        <P
                          className={`text-[10px] font-black uppercase ${statusText}`}
                        >
                          {item.status}
                        </P>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <AnalyticsModal 
        visible={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
      <VendorOrderDetails
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdate={() => {
          // Context updates real-time, just close modal if needed or show feedback
          setSelectedOrder(null);
        }}
      />
      <VendorBookingDetails
        booking={selectedBooking}
        visible={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdate={() => setSelectedBooking(null)}
      />
    </SafeAreaView>
  );
}
