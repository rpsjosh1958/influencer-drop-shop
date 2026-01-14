/// <reference types="nativewind/types" />
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { VendorBookingDetails } from "@/components/vendor/vendor-booking-details";
import { useVendor } from "@/context/vendor-context";
import {
  addDays,
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  subMonths,
  addMonths,
} from "date-fns";
import {
  Menu,
  CalendarIcon,
  List,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";
import { useState, useEffect, useMemo } from "react";
// ... imports

export default function VendorBookings() {
  const navigation = useNavigation<any>();
  const { store, bookings: allBookings, refreshStore } = useVendor();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [showFullCalendar, setShowFullCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Deep linking logic temporarily disabled to fix crash
  // useEffect(() => {
  //   if (params.bookingId && allBookings.length > 0) {
  //     const booking = allBookings.find((b: any) => b.id === params.bookingId);
  //     if (booking) {
  //       setSelectedBooking(booking);
  //     }
  //   }
  // }, [params.bookingId, allBookings]);

  // Generate Date Strip
  const dateStripDocs = useMemo(() => {
    const start = addDays(selectedDate, -3);
    return Array.from({ length: 14 }).map((_, i) => addDays(start, i));
  }, [selectedDate]);

  // Filter bookings for selected date (Calendar View)
  const calendarViewBookings = useMemo(() => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const items = allBookings.filter((b: any) => b.date === dateStr);
    return items.sort((a: any, b: any) =>
      a.startTime.localeCompare(b.startTime)
    );
  }, [allBookings, selectedDate]);

  // All Bookings Sorted (List View)
  const listViewBookings = useMemo(() => {
    return [...allBookings].sort((a: any, b: any) => {
      const dateA = a.date + a.startTime;
      const dateB = b.date + b.startTime;
      return dateB.localeCompare(dateA); // Newest first
    });
  }, [allBookings]);

  // Check if a date has bookings
  const hasBookings = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return allBookings.some((b: any) => b.date === dateStr);
  };

  // Full Calendar Days
  const fullCalendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const BookingCard = ({ booking }: { booking: any }) => (
    <Pressable
      onPress={() => setSelectedBooking(booking)}
      className="flex-row mb-4 bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm active:scale-[0.98] transition-all"
    >
      {/* Time Column */}
      <View className="bg-zinc-50 p-4 items-center justify-center w-24 border-r border-zinc-100">
        <P className="font-bold text-lg text-center leading-5 mb-1">
          {booking.startTime}
        </P>
        <P className="text-xs text-zinc-400 font-bold">{booking.endTime}</P>
        <View className="mt-2 pt-2 border-t border-zinc-200 w-full items-center">
          <P className="text-[10px] text-zinc-400 font-bold uppercase">
            {format(new Date(booking.date), "MMM d")}
          </P>
        </View>
      </View>
      {/* Info */}
      <View className="flex-1 p-4 justify-center">
        <P className="font-bold text-base mb-1" numberOfLines={1}>
          {booking.customerName}
        </P>
        <P className="text-xs text-zinc-500 font-medium mb-2">
          {booking.serviceName}
        </P>
        <View
          className={`self-start px-2 py-0.5 rounded-md ${
            booking.status === "confirmed"
              ? "bg-blue-100"
              : booking.status === "completed"
              ? "bg-green-100"
              : booking.status === "cancelled"
              ? "bg-red-100"
              : booking.status === "pending"
              ? "bg-amber-100"
              : "bg-zinc-100"
          }`}
        >
          <P
            className={`text-[10px] font-bold uppercase ${
              booking.status === "confirmed"
                ? "text-blue-700"
                : booking.status === "completed"
                ? "text-green-700"
                : booking.status === "cancelled"
                ? "text-red-700"
                : booking.status === "pending"
                ? "text-amber-700"
                : "text-zinc-500"
            }`}
          >
            {booking.status}
          </P>
        </View>
      </View>
    </Pressable>
  );

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
          <H1 className="text-xl font-black uppercase">Bookings</H1>
        </View>

        {/* Tabs */}
        <View className="px-6 py-4 flex-row gap-6 border-b border-zinc-100">
          <Pressable onPress={() => setViewMode("calendar")}>
            <P
              className={`text-lg font-bold ${
                viewMode === "calendar" ? "text-black" : "text-zinc-300"
              }`}
            >
              Calendar
            </P>
            {viewMode === "calendar" && (
              <View className="h-1 bg-black w-4 mt-1 rounded-full" />
            )}
          </Pressable>
          <Pressable onPress={() => setViewMode("list")}>
            <P
              className={`text-lg font-bold ${
                viewMode === "list" ? "text-black" : "text-zinc-300"
              }`}
            >
              List
            </P>
            {viewMode === "list" && (
              <View className="h-1 bg-black w-4 mt-1 rounded-full" />
            )}
          </Pressable>
        </View>
      </View>

      {/* CALENDAR VIEW */}
      {viewMode === "calendar" ? (
        <View className="flex-1">
          {/* Selected Date Header + Full Calendar Button */}
          <View className="px-6 pt-6 pb-2 flex-row items-center justify-between">
            <P className="font-bold text-2xl">
              {format(selectedDate, "MMMM d, yyyy")}
            </P>
            <Pressable
              onPress={() => {
                setCurrentMonth(selectedDate);
                setShowFullCalendar(true);
              }}
              className="flex-row items-center gap-1 bg-zinc-100 px-3 py-2 rounded-lg"
            >
              <P className="text-xs font-bold">Full Calendar</P>
              <CalendarIcon size={12} color="black" />
            </Pressable>
          </View>

          {/* Booking Count Summary */}
          <P className="px-6 text-zinc-500 text-xs font-bold mb-4">
            {calendarViewBookings.length} bookings for this day
          </P>

          {/* Date Strip */}
          <View className="bg-zinc-50 pt-4 pb-4 border-b border-zinc-100 mb-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, gap: 10 }}
            >
              {dateStripDocs.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                const hasDots = hasBookings(date);

                return (
                  <Pressable
                    key={i}
                    onPress={() => setSelectedDate(date)}
                    className={`items-center justify-center w-14 h-20 rounded-2xl border relative ${
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
                    {hasDots && (
                      <View
                        className={`w-1.5 h-1.5 rounded-full absolute bottom-2 ${
                          isSelected ? "bg-white" : "bg-black"
                        }`}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: 100,
            }}
            refreshControl={
              <RefreshControl refreshing={false} onRefresh={refreshStore} />
            }
          >
            {calendarViewBookings.length === 0 ? (
              <View className="items-center justify-center py-20 bg-zinc-50 rounded-2xl border border-zinc-100 dashed">
                <CalendarIcon size={40} color="#d4d4d8" />
                <P className="text-zinc-400 font-bold mt-4">No bookings</P>
              </View>
            ) : (
              calendarViewBookings.map((b) => (
                <BookingCard key={b.id} booking={b} />
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        /* LIST VIEW */
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={refreshStore} />
          }
        >
          <P className="text-xs font-bold text-zinc-400 uppercase mb-4">
            All Bookings
          </P>
          {listViewBookings.length === 0 ? (
            <View className="items-center justify-center py-20">
              <P className="text-zinc-400">No bookings found</P>
            </View>
          ) : (
            listViewBookings.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </ScrollView>
      )}

      {/* FULL CALENDAR MODAL */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showFullCalendar}
        onRequestClose={() => setShowFullCalendar(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setShowFullCalendar(false)}
          />
          <View className="bg-white rounded-t-3xl h-[60%] p-6">
            <View className="flex-row items-center justify-between mb-6">
              <H1 className="text-xl font-black uppercase">Select Date</H1>
              <Pressable
                onPress={() => setShowFullCalendar(false)}
                className="bg-zinc-100 p-2 rounded-full"
              >
                <X size={20} color="black" />
              </Pressable>
            </View>

            {/* Controls */}
            <View className="flex-row items-center justify-between mb-6 bg-zinc-50 p-2 rounded-xl border border-zinc-100">
              <Pressable
                onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2"
              >
                <ChevronLeft size={20} color="black" />
              </Pressable>
              <P className="font-bold text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </P>
              <Pressable
                onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2"
              >
                <ChevronRight size={20} color="black" />
              </Pressable>
            </View>

            {/* Grid */}
            <View className="flex-row flex-wrap">
              {/* Days Header */}
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <View key={d} className="w-[14.28%] items-center mb-2">
                  <P className="text-xs font-bold text-zinc-400">{d}</P>
                </View>
              ))}

              {fullCalendarDays.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                const hasDots = hasBookings(date);
                const isTodayDate = isSameDay(date, new Date());

                return (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setSelectedDate(date);
                      setShowFullCalendar(false);
                    }}
                    className={`w-[14.28%] aspect-square items-center justify-center rounded-lg border mb-1 ${
                      isSelected
                        ? "bg-black border-black"
                        : isTodayDate
                        ? "bg-white border-blue-500"
                        : "bg-white border-transparent"
                    }`}
                  >
                    <P
                      className={`text-sm font-bold ${
                        isSelected
                          ? "text-white"
                          : isTodayDate
                          ? "text-blue-600"
                          : "text-black"
                      }`}
                    >
                      {format(date, "d")}
                    </P>
                    {hasDots && (
                      <View
                        className={`w-1 h-1 rounded-full absolute bottom-1 ${
                          isSelected ? "bg-white" : "bg-black"
                        }`}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <VendorBookingDetails
        visible={!!selectedBooking}
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdate={() => {
          refreshStore();
          setSelectedBooking(null);
        }}
      />
    </SafeAreaView>
  );
}
