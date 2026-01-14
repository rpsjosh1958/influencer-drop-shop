/// <reference types="nativewind/types" />
import { View, ScrollView, Pressable, Image, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendor } from "@/context/vendor-context";
import { H1, P } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Package, Menu, Search, Filter } from "lucide-react-native";
import { VendorOrderDetails } from "@/components/vendor/vendor-order-details";

export default function VendorOrders() {
  const navigation = useNavigation<any>();
  const { orders, loading, refreshStore } = useVendor();
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const filteredOrders = useMemo(() => {
    if (filter === "all") return orders;
    if (filter === "active") {
      return orders.filter(
        (o: any) => !["completed", "cancelled", "delivered"].includes(o.status)
      );
    }
    if (filter === "completed") {
      return orders.filter((o: any) =>
        ["completed", "delivered", "cancelled"].includes(o.status)
      );
    }
    return orders;
  }, [orders, filter]);

  const formatMoney = (amount: number) =>
    `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`;

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
          filteredOrders.map((order) => (
            <Pressable
              key={order.id}
              onPress={() => setSelectedOrder(order)}
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
                  <View
                    className={`self-start px-2 py-0.5 rounded-md ${
                      ["paid", "delivered", "completed"].includes(order.status)
                        ? "bg-green-100"
                        : order.status === "sent-out"
                        ? "bg-blue-100"
                        : ["processing", "packaged"].includes(order.status)
                        ? "bg-amber-100"
                        : "bg-zinc-100"
                    }`}
                  >
                    <P
                      className={`text-[10px] font-black uppercase ${
                        ["paid", "delivered", "completed"].includes(
                          order.status
                        )
                          ? "text-green-700"
                          : order.status === "sent-out"
                          ? "text-blue-700"
                          : ["processing", "packaged"].includes(order.status)
                          ? "text-amber-700"
                          : "text-zinc-500"
                      }`}
                    >
                      {order.status}
                    </P>
                  </View>
                </View>
              </View>
              <View>
                <P className="font-bold text-lg">
                  {formatMoney(order.total || 0)}
                </P>
                <P className="text-xs text-zinc-400 text-right">
                  {new Date(
                    order.createdAt?.seconds * 1000
                  ).toLocaleDateString()}
                </P>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <VendorOrderDetails
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onUpdate={() => {
          refreshStore();
          setSelectedOrder(null);
        }}
      />
    </SafeAreaView>
  );
}
