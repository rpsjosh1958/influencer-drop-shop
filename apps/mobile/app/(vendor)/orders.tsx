/// <reference types="nativewind/types" />
import { View, ScrollView, Pressable, Image, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendor } from "@/context/vendor-context";
import { H1, P } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Filter, Menu, Package, Search, Plus } from "lucide-react-native";
import { VendorOrderDetails } from "@/components/vendor/vendor-order-details";
import { formatCurrency } from "@/lib/format";
import { ManualOrderModal } from "@/components/vendor/manual-order-modal";
import { useLocalSearchParams } from "expo-router";
import { getOrderStatusColor } from "@/lib/status-colors";
import { isToday, isYesterday, format as formatDate } from "date-fns";
import type { Order } from "@/types";

const getDateLabel = (seconds?: number) => {
  if (!seconds) return "Unknown";
  const date = new Date(seconds * 1000);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatDate(date, "MMM d");
};

export default function VendorOrders() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { orders, loading, refreshStore, products, store } = useVendor();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [showManualOrder, setShowManualOrder] = useState(false);

  // Deep Link Handling — open the order details modal when arriving from a
  // notification tap with ?orderId=... (in-app tap or OS push tap).
  // Visibility is tracked separately from `selectedOrder` (never cleared
  // back to null on close) — otherwise, since the ?orderId param is never
  // cleared either, closing the modal (or a status update auto-closing it)
  // would immediately re-satisfy this effect's guard and reopen it in a
  // loop.
  useEffect(() => {
    if (params.orderId && !detailsVisible && !selectedOrder && orders.length > 0) {
      const target = orders.find((o) => o.id === params.orderId);
      if (target) {
        setSelectedOrder(target);
        setDetailsVisible(true);
      }
    }
  }, [params.orderId, orders, detailsVisible, selectedOrder]);

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsVisible(true);
  };

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") {
      return orders.filter(
        (o) => !["completed", "cancelled", "delivered"].includes(o.status)
      );
    }
    if (filter === "completed") {
      return orders.filter((o) =>
        ["completed", "delivered", "cancelled"].includes(o.status)
      );
    }
    return orders;
  }, [orders, filter]);

  // filteredOrders is already sorted desc (from the underlying query), so
  // consecutive same-day orders naturally land in the same group here.
  const groupedOrders = useMemo(() => {
    const groups: { label: string; items: Order[] }[] = [];
    filteredOrders.forEach((order) => {
      const label = getDateLabel(order.createdAt?.seconds);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(order);
      } else {
        groups.push({ label, items: [order] });
      }
    });
    return groups;
  }, [filteredOrders]);

  const formatMoney = (amount: number) => formatCurrency(amount);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Menu size={24} color="black" />
          </Pressable>
          <H1 className="text-xl font-black uppercase">Orders</H1>
        </View>
        <Pressable
          onPress={() => setShowManualOrder(true)}
          className="bg-black w-10 h-10 rounded-full items-center justify-center flex-row shadow-sm active:scale-95 transition-all"
        >
          <Plus size={20} color="white" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="px-6 py-4 flex-row gap-6 border-b border-zinc-100">
        <Pressable onPress={() => setFilter("all")}>
          <P
            className={`text-lg font-bold ${
              filter === "all" ? "text-black" : "text-zinc-300"
            }`}
          >
            All
          </P>
          {filter === "all" && (
            <View className="h-1 bg-black w-4 mt-1 rounded-full" />
          )}
        </Pressable>
        <Pressable onPress={() => setFilter("active")}>
          <P
            className={`text-lg font-bold ${
              filter === "active" ? "text-black" : "text-zinc-300"
            }`}
          >
            Open
          </P>
          {filter === "active" && (
            <View className="h-1 bg-black w-4 mt-1 rounded-full" />
          )}
        </Pressable>
        <Pressable onPress={() => setFilter("completed")}>
          <P
            className={`text-lg font-bold ${
              filter === "completed" ? "text-black" : "text-zinc-300"
            }`}
          >
            Delivered
          </P>
          {filter === "completed" && (
            <View className="h-1 bg-black w-4 mt-1 rounded-full" />
          )}
        </Pressable>
      </View>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshStore} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Search size={40} color="#d4d4d8" />
            <P className="text-zinc-400 font-bold mt-4">No orders found</P>
          </View>
        ) : (
          groupedOrders.map((group) => (
            <View key={group.label} className="mb-2">
              <P className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2 mt-1">
                {group.label}
              </P>
              {group.items.map((order) => {
                const { bg: statusBg, text: statusText } = getOrderStatusColor(
                  order.status
                );
                return (
                  <Pressable
                    key={order.id}
                    onPress={() => openOrderDetails(order)}
                    className="bg-white p-4 mb-4 rounded-2xl border border-zinc-100 flex-row items-center justify-between shadow-sm active:scale-[0.98] transition-all"
                  >
                    <View className="flex-row items-center gap-4">
                      <View className="w-12 h-12 bg-zinc-50 rounded-full items-center justify-center border border-zinc-100">
                        <Package size={20} color="#71717a" />
                      </View>
                      <View>
                        <P className="font-bold text-base">
                          {order.customerName || "Customer"}
                        </P>
                        <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </P>
                        <View className="flex-row items-center gap-1.5">
                          <View className={`self-start px-2 py-0.5 rounded-md ${statusBg}`}>
                            <P className={`text-[10px] font-black uppercase ${statusText}`}>
                              {order.status}
                            </P>
                          </View>
                          {order.paymentMethod === "manual" && (
                            <View className="self-start px-2 py-0.5 rounded-md bg-zinc-100">
                              <P className="text-[10px] font-black uppercase text-zinc-500">
                                Manual
                              </P>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <View>
                      <P className="font-bold text-lg">
                        {formatMoney(order.total || 0)}
                      </P>
                      <P className="text-xs text-zinc-400 text-right">
                        {order.createdAt?.seconds
                          ? new Date(
                              order.createdAt.seconds * 1000
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </P>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <VendorOrderDetails
        order={selectedOrder}
        visible={detailsVisible}
        onClose={() => setDetailsVisible(false)}
        onUpdate={() => {
          refreshStore();
          setDetailsVisible(false);
        }}
      />

      <ManualOrderModal
        visible={showManualOrder}
        onClose={() => setShowManualOrder(false)}
        products={products}
        storeId={store?.id || ""}
        storeName={store?.name || "Store"}
      />
    </SafeAreaView>
  );
}
