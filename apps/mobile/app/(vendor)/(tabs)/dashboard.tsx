import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendor } from "@/context/vendor-context";
import { H1, P, H2 } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import {
  CreditCard,
  ShoppingBag,
  Package,
  Menu,
  Zap,
  TrendingUp,
} from "lucide-react-native";
import { MotiView } from "moti";
import { router } from "expo-router";
import { useState } from "react";
import * as Haptics from "expo-haptics";

export default function VendorDashboard() {
  const { store, metrics, loading, toggleStoreStatus, orders } = useVendor();
  const [toggling, setToggling] = useState(false);
  const navigation = useNavigation();

  const formatMoney = (amount: number) =>
    `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

  const handleToggleStatus = async () => {
    setToggling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await toggleStoreStatus();
    } catch (e) {
      // alert handled likely
    } finally {
      setToggling(false);
    }
  };

  if (loading && !store) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  const isLive = store?.status === "live";

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
            <H1 className="text-xl font-black uppercase">
              {store?.name || "Dashboard"}
            </H1>
            <P className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {isLive ? "● Store is Live" : "● Store is Closed"}
            </P>
          </View>
        </View>

        {/* Live Toggle */}
        <Pressable
          onPress={handleToggleStatus}
          disabled={toggling}
          className={`flex-row items-center gap-2 px-3 py-2 rounded-full border ${
            isLive
              ? "bg-green-100 border-green-200"
              : "bg-zinc-100 border-zinc-200"
          }`}
        >
          <View
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-green-600" : "bg-zinc-400"
            }`}
          />
          <P
            className={`text-xs font-bold ${
              isLive ? "text-green-700" : "text-zinc-500"
            }`}
          >
            {isLive ? "LIVE" : "CLOSED"}
          </P>
        </Pressable>
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
                  <P className="text-zinc-400 text-xs font-bold">+0% today</P>
                </View>
              </View>
              <P className="text-zinc-400 font-medium mb-1">Total Revenue</P>
              <H1 className="text-4xl text-white font-black tracking-tight">
                {formatMoney(metrics.revenue)}
              </H1>
            </View>
          </MotiView>

          {/* Stats Row */}
          <View className="flex-row gap-4 w-full">
            {/* Orders */}
            <View className="flex-1 bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
              <ShoppingBag color="#3b82f6" size={24} className="mb-4" />
              <H1 className="text-2xl font-black">{metrics.activeOrders}</H1>
              <P className="text-zinc-500 text-xs font-bold uppercase mt-1">
                Active Orders
              </P>
            </View>

            {/* Total Orders */}
            <View className="flex-1 bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
              <TrendingUp color="#10b981" size={24} className="mb-4" />
              <H1 className="text-2xl font-black">{metrics.totalOrders}</H1>
              <P className="text-zinc-500 text-xs font-bold uppercase mt-1">
                Total Sales
              </P>
            </View>
          </View>
        </View>

        {/* Recent Orders Section */}
        <View className="mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <H2 className="text-lg font-black uppercase">Recent Orders</H2>
            <Pressable onPress={() => router.push("/(vendor)/orders" as any)}>
              <P className="text-blue-600 font-bold text-sm">View All</P>
            </Pressable>
          </View>

          {orders.length === 0 ? (
            <View className="bg-white p-8 rounded-2xl border border-dashed border-zinc-300 items-center">
              <P className="text-zinc-400 font-bold">No orders yet</P>
            </View>
          ) : (
            <View className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <Pressable
                  key={order.id}
                  className="bg-white p-4 rounded-2xl border border-zinc-100 flex-row items-center justify-between active:scale-[0.98] transition-all"
                  // onPress -> Open Details Modal
                >
                  <View className="flex-row items-center gap-4">
                    <View className="w-10 h-10 bg-zinc-50 rounded-full items-center justify-center border border-zinc-100">
                      <Package size={18} color="#71717a" />
                    </View>
                    <View>
                      <P className="font-bold text-base">
                        {order.customerName || "Customer"}
                      </P>
                      <P className="text-xs text-zinc-400 font-bold uppercase">
                        {new Date(
                          order.createdAt?.seconds * 1000
                        ).toLocaleDateString()}
                      </P>
                    </View>
                  </View>
                  <View className="items-end">
                    <P className="font-bold text-base">
                      {formatMoney(order.total || 0)}
                    </P>
                    <View
                      className={`px-2 py-0.5 rounded-md mt-1 ${
                        order.status === "paid" ? "bg-green-100" : "bg-zinc-100"
                      }`}
                    >
                      <P
                        className={`text-[10px] font-black uppercase ${
                          order.status === "paid"
                            ? "text-green-700"
                            : "text-zinc-500"
                        }`}
                      >
                        {order.status}
                      </P>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
