import { View, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendor } from "@/context/vendor-context";
import { H1, P } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Package, Search, Menu } from "lucide-react-native";
import { useState, useMemo } from "react";
import { VendorOrderDetails } from "@/components/vendor/vendor-order-details";

export default function VendorOrders() {
  const { orders, loading, refreshStore } = useVendor();
  const [filter, setFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const navigation = useNavigation();

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

      {/* Filter Tabs */}
      <View className="px-6 py-4">
        <View className="flex-row bg-zinc-100 p-1 rounded-xl">
          {["all", "active", "completed"].map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className={`flex-1 py-2 items-center justify-center rounded-lg ${
                filter === f ? "bg-white shadow-sm" : ""
              }`}
            >
              <P
                className={`text-xs font-bold uppercase ${
                  filter === f ? "text-black" : "text-zinc-500"
                }`}
              >
                {f}
              </P>
            </Pressable>
          ))}
        </View>
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
