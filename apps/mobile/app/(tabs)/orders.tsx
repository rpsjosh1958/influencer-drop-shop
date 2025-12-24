import { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  Text,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { Package, ShoppingBag, ChevronRight, Clock } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { OrderDetailsModal } from "@/components/shop/order-details-modal";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useStore } from "@/context/store-context";

export default function OrdersScreen() {
  const router = useRouter();
  const { storeId } = useStore(); // Get storeId
  const params = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const FILTERS = ["all", "paid", "packaged", "sent-out", "delivered"];

  const fetchOrders = async (userId: string) => {
    if (!storeId) return;
    try {
      const q = query(
        collection(db, "stores", storeId, "orders"), // Updated path
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(data);
    } catch (e) {
      console.error("Error fetching orders:", e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchOrders(u.uid);
      }
      setLoading(false);
    });
    return unsub;
  }, [storeId]); // Re-fetch if store changes

  // Deep Link Handling
  useEffect(() => {
    if (params.orderId && orders.length > 0 && !detailsVisible) {
      const target = orders.find((o) => o.id === params.orderId);
      if (target) {
        openDetails(target);
        // Clear param to prevent reopening loop if state changes
        router.setParams({ orderId: "" });
      }
    }
  }, [params.orderId, orders]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchOrders(user.uid);
    setRefreshing(false);
  };

  const filteredOrders = orders.filter((o) =>
    statusFilter === "all" ? true : o.status === statusFilter
  );

  const openDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsVisible(true);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  // Not Logged In State
  if (!user) {
    return (
      <View className="flex-1 bg-white">
        <StatusBar style="dark" />
        <SafeAreaView className="flex-1 px-6 justify-center items-center">
          <View className="w-24 h-24 bg-zinc-100 rounded-full items-center justify-center mb-8">
            <Package size={40} color="#71717a" />
          </View>
          <H1 className="text-3xl font-black text-center mb-2">MY ORDERS</H1>
          <P className="text-zinc-500 text-center mb-8">
            Sign in to view your order history and track shipments.
          </P>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            className="bg-black w-full py-4 rounded-xl items-center"
          >
            <P className="text-white font-bold uppercase tracking-wider">
              Sign In
            </P>
          </Pressable>
        </SafeAreaView>
      </View>
    );
  }

  // Get Status Color Helper (Duplicate logic for list item slightly simplified)
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
      case "completed":
        return "bg-green-50 border-green-100";
      case "sent-out":
        return "bg-blue-50 border-blue-100";
      case "packaged":
        return "bg-purple-50 border-purple-100";
      default:
        return "bg-yellow-50 border-yellow-100";
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
      case "completed":
        return "text-green-600";
      case "sent-out":
        return "text-blue-600";
      case "packaged":
        return "text-purple-600";
      default:
        return "text-yellow-600";
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1" edges={["top"]}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-zinc-100 bg-white">
          <H1 className="text-2xl font-black uppercase">My Orders</H1>
          <P className="text-zinc-500 text-xs font-bold tracking-widest uppercase mb-4">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "Order" : "Orders"} Found
          </P>

          {/* Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingRight: 24 }}
            className="flex-row"
          >
            {FILTERS.map((filter) => (
              <Pressable
                key={filter}
                onPress={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-full border ${
                  statusFilter === filter
                    ? "bg-black border-black"
                    : "bg-white border-zinc-200"
                }`}
              >
                <P
                  className={`text-xs font-bold uppercase ${
                    statusFilter === filter ? "text-white" : "text-zinc-500"
                  }`}
                >
                  {filter.replace("-", " ")}
                </P>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {orders.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <View className="w-20 h-20 bg-zinc-50 rounded-full items-center justify-center mb-6">
              <ShoppingBag size={32} color="#d4d4d8" />
            </View>
            <H1 className="text-xl font-bold mb-2">No orders yet</H1>
            <P className="text-zinc-500 text-center">
              Looks like you haven't dropped on anything yet. Start shopping!
            </P>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ padding: 24, gap: 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openDetails(item)}
                className="bg-white border border-zinc-100 rounded-2xl p-4 active:bg-zinc-50 transition-colors shadow-sm"
              >
                {/* Header: ID, Price */}
                <View className="flex-row justify-between items-center mb-4">
                  <P className="text-xs font-black bg-zinc-100 px-2 py-1 rounded text-zinc-600 overflow-hidden">
                    #{item.id.slice(0, 6).toUpperCase()}
                  </P>
                  <H1 className="text-lg font-black">
                    {typeof item.total === "number"
                      ? `GHS ${item.total.toFixed(2)}`
                      : "GHS 0.00"}
                  </H1>
                </View>

                {/* Content: Image Left, Status & Date Right */}
                <View className="flex-row items-center justify-between">
                  {/* Image */}
                  <View>
                    {item.items && item.items.length > 0 ? (
                      <Image
                        source={{
                          uri:
                            item.items[0].imageUrl ||
                            item.items[0].image ||
                            item.items[0].images?.[0],
                        }}
                        className="w-16 h-16 bg-zinc-100 rounded-xl border border-zinc-100"
                      />
                    ) : (
                      <View className="w-16 h-16 bg-zinc-100 rounded-xl border border-zinc-100 items-center justify-center">
                        <ShoppingBag size={24} color="#e4e4e7" />
                      </View>
                    )}
                  </View>

                  {/* Details */}
                  <View className="items-end">
                    <View
                      className={`px-2 py-0.5 rounded-full border mb-2 ${getStatusColor(
                        item.status
                      )}`}
                    >
                      <P
                        className={`text-[10px] font-bold uppercase ${getStatusTextColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </P>
                    </View>

                    <View className="flex-row items-center gap-1">
                      <Clock size={14} color="#a1a1aa" />
                      <P className="text-xs text-zinc-400 font-bold uppercase">
                        {item.createdAt
                          ? new Date(
                              item.createdAt.seconds * 1000
                            ).toLocaleDateString("en-GB")
                          : ""}
                      </P>
                    </View>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}

        <OrderDetailsModal
          visible={detailsVisible}
          order={selectedOrder}
          onClose={() => setDetailsVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}
