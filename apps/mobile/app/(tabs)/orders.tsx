import { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import {
  Package,
  ShoppingBag,
  Clock,
  Briefcase,
  Calendar,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { OrderDetailsModal } from "@/components/shop/order-details-modal";
import { BookingDetailsModal } from "@/components/shop/booking-details-modal";
import { useRouter, useLocalSearchParams } from "expo-router";

import { useStore } from "@/context/store-context";

export default function OrdersScreen() {
  const router = useRouter();
  const { storeId } = useStore();
  const params = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Unified List State
  const [activities, setActivities] = useState<any[]>([]);

  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [bookingDetailsVisible, setBookingDetailsVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  const fetchData = async (userId: string) => {
    try {
      // 1. Fetch Orders
      const orderQ = query(
        collectionGroup(db, "orders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const orderSnap = await getDocs(orderQ);
      const orderData = orderSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "order",
        storeId: doc.data().storeId || doc.ref.parent.parent?.id,
      }));

      // 2. Fetch Bookings
      const bookingQ = query(
        collectionGroup(db, "bookings"),
        where("customerId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const bookingSnap = await getDocs(bookingQ);
      const bookingData = bookingSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        type: "booking",
        storeId: doc.data().storeId || doc.ref.parent.parent?.id,
      }));

      // 3. Combine and Sort
      const combined = [...orderData, ...bookingData].sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return dateB - dateA;
      });

      setActivities(combined);
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        await fetchData(u.uid);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Deep Link Handling
  useEffect(() => {
    if (params.orderId && activities.length > 0 && !detailsVisible) {
      const target = activities.find(
        (o) => o.id === params.orderId && o.type === "order"
      );
      if (target) {
        openOrderDetails(target);
        router.setParams({ orderId: "" });
      }
    }
  }, [params.orderId, activities]);

  const onRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    await fetchData(user.uid);
    setRefreshing(false);
  };

  const openOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setDetailsVisible(true);
  };

  const openBookingDetails = (booking: any) => {
    setSelectedBooking(booking);
    setBookingDetailsVisible(true);
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
      case "completed":
        return "text-green-600 bg-green-50 border-green-100";
      case "sent-out":
        return "text-blue-600 bg-blue-50 border-blue-100";
      case "packaged":
        return "text-purple-600 bg-purple-50 border-purple-100";
      default:
        return "text-yellow-600 bg-yellow-50 border-yellow-100";
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-blue-600 bg-blue-50 border-blue-100";
      case "completed":
        return "text-green-600 bg-green-50 border-green-100";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-100";
      case "pending":
        return "text-amber-600 bg-amber-50 border-amber-100";
      default:
        return "text-zinc-600 bg-zinc-100 border-zinc-200";
    }
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
          <H1 className="text-3xl font-black text-center mb-2">MY ACTIVITY</H1>
          <P className="text-zinc-500 text-center mb-8">
            Sign in to view your orders and bookings.
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

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 pb-20 mb-10" edges={["top"]}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-zinc-100 bg-white">
          <H1 className="text-2xl font-black uppercase mb-1">My Activity</H1>
          <P className="text-zinc-500 text-xs font-bold uppercase tracking-wider">
            All your orders & bookings
          </P>
        </View>

        {activities.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <View className="w-20 h-20 bg-zinc-50 rounded-full items-center justify-center mb-6">
              <ShoppingBag size={32} color="#d4d4d8" />
            </View>
            <H1 className="text-xl font-bold mb-2">No activity yet</H1>
            <P className="text-zinc-500 text-center">
              Start shopping or booking services to see them here!
            </P>
          </View>
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            contentContainerStyle={{ padding: 24, gap: 16 }}
            renderItem={({ item }) => {
              // RENDER ORDER
              if (item.type === "order") {
                return (
                  <Pressable
                    onPress={() => openOrderDetails(item)}
                    className="bg-white border border-zinc-100 rounded-2xl p-4 active:bg-zinc-50 transition-colors shadow-sm"
                  >
                    <View className="flex-row justify-between items-center mb-4">
                      <View>
                        {item.storeName && (
                          <P className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                            {item.storeName}
                          </P>
                        )}
                        <P className="text-xs font-black bg-zinc-100 px-2 py-1 rounded text-zinc-600 overflow-hidden self-start">
                          #{item.id.slice(0, 6).toUpperCase()}
                        </P>
                      </View>
                      <H1 className="text-lg font-black">
                        {typeof item.total === "number"
                          ? `GHS ${item.total.toFixed(2)}`
                          : "GHS 0.00"}
                      </H1>
                    </View>

                    <View className="flex-row items-center justify-between">
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

                      <View className="items-end">
                        <View
                          className={`px-2 py-0.5 rounded-full border mb-2 ${
                            getOrderStatusColor(item.status).split(" ")[1]
                          } ${getOrderStatusColor(item.status).split(" ")[2]}`}
                        >
                          <P
                            className={`text-[10px] font-bold uppercase ${
                              getOrderStatusColor(item.status).split(" ")[0]
                            }`}
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
                );
              }

              // RENDER BOOKING
              if (item.type === "booking") {
                return (
                  <Pressable
                    onPress={() => openBookingDetails(item)}
                    className="bg-white border border-zinc-100 rounded-2xl p-4 active:bg-zinc-50 transition-colors shadow-sm"
                  >
                    <View className="flex-row justify-between items-start mb-4">
                      <View className="flex-1 mr-4">
                        {item.storeName && (
                          <P className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                            {item.storeName}
                          </P>
                        )}
                         <View className="bg-violet-100 self-start px-2 py-0.5 rounded-md mb-1">
                            <P className="text-[10px] font-black text-violet-700 uppercase">
                                Booking
                            </P>
                        </View>
                        <H1 className="text-lg font-black" numberOfLines={1}>
                          {item.serviceName}
                        </H1>
                      </View>
                      <H1 className="text-lg font-black">
                        GHS {item.servicePrice.toFixed(2)}
                      </H1>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <Calendar size={14} color="#a1a1aa" />
                        <P className="text-xs text-zinc-500 font-bold uppercase">
                          {item.date
                            ? new Date(item.date).toLocaleDateString("en-GB", {
                                month: "short",
                                day: "numeric",
                              })
                            : ""}
                        </P>
                        <View className="w-1 h-1 bg-zinc-300 rounded-full" />
                        <Clock size={14} color="#a1a1aa" />
                        <P className="text-xs text-zinc-500 font-bold uppercase">
                          {item.startTime}
                        </P>
                      </View>

                      <View className="items-end">
                        <View
                          className={`px-2 py-0.5 rounded-full border ${
                            getBookingStatusColor(item.status).split(" ")[1]
                          } ${
                            getBookingStatusColor(item.status).split(" ")[2]
                          }`}
                        >
                          <P
                            className={`text-[10px] font-bold uppercase ${
                              getBookingStatusColor(item.status).split(" ")[0]
                            }`}
                          >
                            {item.status}
                          </P>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              }

              return null;
            }}
          />
        )}

        <OrderDetailsModal
          visible={detailsVisible}
          order={selectedOrder}
          onClose={() => setDetailsVisible(false)}
        />

        {bookingDetailsVisible && selectedBooking && (
          <BookingDetailsModal
            visible={bookingDetailsVisible}
            booking={selectedBooking}
            onClose={() => setBookingDetailsVisible(false)}
          />
        )}
      </SafeAreaView>
    </View>
  );
}
