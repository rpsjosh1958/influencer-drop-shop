import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useState, useEffect, useMemo } from "react";
import { useVendor } from "@/context/vendor-context";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { addDays, format, startOfDay, parseISO } from "date-fns";
import { Calendar, Clock, Briefcase, Menu } from "lucide-react-native";
import { VendorBookingDetails } from "@/components/vendor/vendor-booking-details";

export default function VendorBookings() {
  const { store } = useVendor();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const navigation = useNavigation();

  // Generate next 14 days
  const dates = useMemo(() => {
    return Array.from({ length: 14 }).map((_, i) => addDays(new Date(), i));
  }, []);

  useEffect(() => {
    if (!store?.id) return;
    setLoading(true);

    // Fetch bookings for the selected date
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const q = query(
      collection(db, "stores", store.id, "bookings"),
      where("date", "==", dateStr)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // Sort by time
      items.sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));
      setBookings(items);
      setLoading(false);
    });

    return () => unsub();
  }, [store?.id, selectedDate]);

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
          <H1 className="text-xl font-black uppercase">Schedule</H1>
        </View>
      </View>

      {/* Date Strip */}
      <View className="bg-zinc-50 pt-4 pb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
        >
          {dates.map((date, i) => {
            const isSelected =
              format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
            return (
              <Pressable
                key={i}
                onPress={() => setSelectedDate(date)}
                className={`items-center justify-center w-14 h-20 rounded-2xl border ${
                  isSelected
                    ? "bg-black border-black"
                    : "bg-white border-zinc-200"
                }`}
              >
                <P
                  className={`text-xs font-bold mb-1 ${
                    isSelected ? "text-zinc-400" : "text-zinc-400"
                  }`}
                >
                  {format(date, "EEE")}
                </P>
                <P
                  className={`text-xl font-black ${
                    isSelected ? "text-white" : "text-black"
                  }`}
                >
                  {format(date, "d")}
                </P>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
        <P className="font-bold text-lg mb-4">
          {format(selectedDate, "MMMM d, yyyy")}
        </P>

        {loading ? (
          <ActivityIndicator color="black" />
        ) : bookings.length === 0 ? (
          <View className="items-center justify-center py-20 bg-zinc-50 rounded-2xl border border-zinc-100 dashed">
            <Calendar size={40} color="#d4d4d8" />
            <P className="text-zinc-400 font-bold mt-4">
              No bookings for this day
            </P>
          </View>
        ) : (
          bookings.map((booking) => (
            <Pressable
              key={booking.id}
              onPress={() => setSelectedBooking(booking)}
              className="flex-row mb-4 bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-all"
            >
              {/* Time Column */}
              <View className="bg-zinc-50 p-4 items-center justify-center w-20 border-r border-zinc-100">
                <P className="font-bold text-lg">{booking.startTime}</P>
                <P className="text-xs text-zinc-400 font-bold">
                  {booking.endTime}
                </P>
              </View>
              {/* Info */}
              <View className="flex-1 p-4 justify-center">
                <P className="font-bold text-base mb-1">
                  {booking.customerName}
                </P>
                <P className="text-xs text-zinc-500 font-medium mb-2">
                  {booking.serviceName}
                </P>
                <View
                  className={`self-start px-2 py-0.5 rounded-md ${
                    booking.status === "confirmed"
                      ? "bg-blue-50 text-blue-600"
                      : booking.status === "completed"
                      ? "bg-green-50 text-green-600"
                      : "bg-zinc-100 text-zinc-500"
                  }`}
                >
                  <P className="text-[10px] font-bold uppercase">
                    {booking.status}
                  </P>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <VendorBookingDetails
        visible={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdate={() => setSelectedBooking(null)}
      />
    </SafeAreaView>
  );
}
