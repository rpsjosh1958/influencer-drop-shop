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
} from "lucide-react-native";
import { MotiView } from "moti";
import { useState, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { VendorOrderDetails } from "@/components/vendor/vendor-order-details";
import { VendorBookingDetails } from "@/components/vendor/vendor-booking-details";

export default function VendorDashboard() {
  const { store, metrics, loading, toggleStoreStatus, orders, bookings } =
    useVendor();
  const [toggling, setToggling] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
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
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Menu size={24} color="black" />
          </Pressable>
          <View>
            <View className="flex-row items-center gap-1">
              <H1 className="text-xl font-black uppercase">
                {store?.name || "Dashboard"}
              </H1>
              {isVerified && (
                <BadgeCheck size={18} color="#2563eb" fill="white" />
              )}
            </View>
            <P className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {store?.category || "General Store"}
            </P>
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
            {/* Status Card (Toggle) */}
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

            {/* Metrics */}
            <View className="flex-1 bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm justify-between">
              <View className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center">
                <TrendingUp color="#3b82f6" size={20} />
              </View>
              <View>
                <H1 className="text-2xl font-black">{metrics.totalOrders}</H1>
                <P className="text-zinc-500 text-xs font-bold uppercase mt-1">
                  Total Sales
                </P>
              </View>
            </View>
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
