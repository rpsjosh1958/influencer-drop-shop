"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  orderBy,
  where,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { Booking, BookingStatus } from "@/types";
import {
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpTrigger } from "@/context/onboarding-context";
import { formatCurrency } from "@/lib/utils";
import { Portal } from "@/components/ui/portal";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
  parseISO,
} from "date-fns";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50" },
  confirmed: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-50" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-50" },
  "no-show": { label: "No Show", color: "text-zinc-700", bg: "bg-zinc-100" },
};

export default function BookingsPage() {
  const { storeId, storeName, loading: storeLoading } = useAdminStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updating, setUpdating] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Fetch bookings
  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, "stores", storeId, "bookings"),
      orderBy("date", "desc"),
    );
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Booking,
      );
      setBookings(items);
      setLoading(false);
    });
    return () => unsub();
  }, [storeId]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Bookings by date
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      const key = b.date;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [bookings]);

  // Selected date bookings
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return (bookingsByDate[key] || []).sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
  }, [selectedDate, bookingsByDate]);

  const updateBookingStatus = async (
    booking: Booking,
    status: BookingStatus,
  ) => {
    if (!storeId) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, "stores", storeId, "bookings", booking.id), {
        status,
        updatedAt: Timestamp.now(),
      });
      setSelectedBooking({ ...booking, status });

      // Send Notification on Confirmation
      if (status === "confirmed") {
        await addDoc(collection(db, "notifications"), {
          userId: booking.customerId,
          type: "booking_confirmed",
          title: "Booking Confirmed! 🎉",
          message: `Your appointment for ${booking.serviceName} on ${format(
            parseISO(booking.date),
            "MMM d",
          )} at ${booking.startTime} has been confirmed.`,
          isRead: false,
          createdAt: Timestamp.now(),
          metadata: {
            bookingId: booking.id,
            storeId: storeId,
            storeName: storeName || "Store",
          },
        });
      }

      // Send Notification on Cancellation (Admin Cancel)
      if (status === "cancelled") {
        await addDoc(collection(db, "notifications"), {
          userId: booking.customerId,
          type: "booking_cancelled_admin",
          title: "Booking Unavailable ❌",
          message: `Unfortunately, your appointment for ${
            booking.serviceName
          } on ${format(
            parseISO(booking.date),
            "MMM d",
          )} is unavailable. Please reschedule at your convenience.`,
          isRead: false,
          createdAt: Timestamp.now(),
          metadata: {
            bookingId: booking.id,
            storeId: storeId,
            storeName: storeName || "Store",
          },
        });
      }
    } catch (err) {
      console.error("Failed to update booking", err);
    } finally {
      setUpdating(false);
    }
  };

  if (storeLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Bookings
            <HelpTrigger category="bookings" />
          </h1>
          <p className="text-zinc-500">Manage customer appointments.</p>
        </div>

        {/* View Toggle */}
        <div
          data-tour="bookings-view-toggle"
          className="flex bg-zinc-100 p-1 rounded-xl"
        >
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "calendar"
                ? "bg-white shadow text-black"
                : "text-zinc-500"
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === "list"
                ? "bg-white shadow text-black"
                : "text-zinc-500"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="relative flex flex-col lg:block">
          {/* Calendar */}
          <div
            data-tour="bookings-calendar"
            className="bg-white rounded-3xl border border-zinc-200 p-6 lg:w-[calc(100%-374px)] mb-6 lg:mb-0"
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-zinc-100 rounded-lg text-black transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl text-black font-bold">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-zinc-100 rounded-lg text-black transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-bold text-zinc-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayBookings = bookingsByDate[dateKey] || [];
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(day)}
                    className={`aspect-square p-1 rounded-xl transition-all relative ${
                      !isCurrentMonth
                        ? "text-zinc-300"
                        : isSelected
                          ? "bg-black text-white"
                          : isToday(day)
                            ? "bg-blue-50 text-blue-600"
                            : "text-black hover:bg-zinc-100"
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {format(day, "d")}
                    </span>
                    {dayBookings.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {dayBookings.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-white/70" : "bg-blue-500"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Bookings */}
          <div
            data-tour="bookings-date-panel"
            className="bg-white rounded-3xl border border-zinc-200 p-6 lg:absolute lg:top-0 lg:right-0 lg:bottom-0 lg:w-[350px] flex flex-col"
          >
            <h3 className="font-bold text-black mb-4 shrink-0">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d")
                : "Select a date"}
            </h3>

            <div className="flex-1 overflow-y-auto min-h-0 -mr-2 pr-2">
              {!selectedDate ? (
                <p className="text-zinc-400 text-sm text-center py-8">
                  Click on a date to see bookings.
                </p>
              ) : selectedDateBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto text-zinc-300 mb-2" size={32} />
                  <p className="text-zinc-400 text-sm">
                    No bookings for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pb-2">
                  {selectedDateBookings.map((booking) => (
                    <button
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className="w-full text-left p-4 rounded-2xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-bold text-black">
                          {booking.serviceName}
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-1 rounded-full ${
                            STATUS_CONFIG[booking.status].bg
                          } ${STATUS_CONFIG[booking.status].color}`}
                        >
                          {STATUS_CONFIG[booking.status].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Clock size={14} />
                        <span>
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1">
                        <User size={14} />
                        <span>{booking.customerName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden">
          {bookings.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="mx-auto text-zinc-300 mb-4" size={48} />
              <h3 className="text-lg font-bold mb-2">No bookings yet</h3>
              <p className="text-zinc-500">
                Bookings will appear here when customers make appointments.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-bold text-zinc-500">
                    Date & Time
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-bold text-zinc-500">
                    Service
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-bold text-zinc-500">
                    Customer
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-bold text-zinc-500">
                    Status
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-bold text-zinc-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">
                        {format(parseISO(booking.date), "MMM d, yyyy")}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {booking.startTime} - {booking.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">
                        {booking.serviceName}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {formatCurrency(booking.servicePrice)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-black">
                        {booking.customerName}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {booking.customerPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                          STATUS_CONFIG[booking.status].bg
                        } ${STATUS_CONFIG[booking.status].color}`}
                      >
                        {STATUS_CONFIG[booking.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 text-sm font-medium hover:underline">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      <Portal>
      <AnimatePresence>
        {selectedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedBooking(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <h2 className="text-xl text-black font-bold">
                  Booking Details
                </h2>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 hover:bg-zinc-100 text-black rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Service */}
                <div className="p-4 bg-zinc-50 rounded-2xl">
                  <div className="text-sm text-zinc-500 mb-1">Service</div>
                  <div className="font-bold text-black text-lg">
                    {selectedBooking.serviceName}
                  </div>
                  <div className="text-zinc-600">
                    {formatCurrency(selectedBooking.servicePrice)}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="flex gap-4">
                  <div className="flex-1 p-4 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                      <Calendar size={14} />
                      <span>Date</span>
                    </div>
                    <div className="font-bold text-black">
                      {format(parseISO(selectedBooking.date), "MMM d, yyyy")}
                    </div>
                  </div>
                  <div className="flex-1 p-4 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-sm text-zinc-500 mb-1">
                      <Clock size={14} />
                      <span>Time</span>
                    </div>
                    <div className="font-bold text-black">
                      {selectedBooking.startTime} - {selectedBooking.endTime}
                    </div>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <User size={18} className="text-zinc-400" />
                    <span className="font-medium text-black">
                      {selectedBooking.customerName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <Phone size={18} className="text-zinc-400" />
                    <a
                      href={`tel:${selectedBooking.customerPhone}`}
                      className="font-medium text-blue-600"
                    >
                      {selectedBooking.customerPhone}
                    </a>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                    <Mail size={18} className="text-zinc-400" />
                    <a
                      href={`mailto:${selectedBooking.customerEmail}`}
                      className="font-medium text-blue-600"
                    >
                      {selectedBooking.customerEmail}
                    </a>
                  </div>
                </div>

                {/* Customer Notes */}
                {selectedBooking.customerNotes && (
                  <div className="p-4 bg-amber-50 rounded-2xl">
                    <div className="flex items-center gap-2 text-sm text-amber-700 mb-2">
                      <MessageSquare size={14} />
                      <span className="font-bold">Customer Note</span>
                    </div>
                    <p className="text-amber-900">
                      {selectedBooking.customerNotes}
                    </p>
                  </div>
                )}

                {/* Current Status */}
                <div className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200">
                  <span className="text-zinc-600">Status</span>
                  <span
                    className={`font-bold px-3 py-1 rounded-full ${
                      STATUS_CONFIG[selectedBooking.status].bg
                    } ${STATUS_CONFIG[selectedBooking.status].color}`}
                  >
                    {STATUS_CONFIG[selectedBooking.status].label}
                  </span>
                </div>

                {/* Actions */}
                {(selectedBooking.status === "pending" ||
                  selectedBooking.status === "confirmed") && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {selectedBooking.status === "pending" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(selectedBooking, "confirmed")
                        }
                        disabled={updating}
                        className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {updating ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                        Confirm
                      </button>
                    )}
                    {selectedBooking.status === "confirmed" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(selectedBooking, "completed")
                        }
                        disabled={updating}
                        className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {updating ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Check size={18} />
                        )}
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() =>
                        updateBookingStatus(selectedBooking, "cancelled")
                      }
                      disabled={updating}
                      className="flex items-center justify-center gap-2 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <X size={18} />
                      Cancel
                    </button>
                    {selectedBooking.status === "confirmed" && (
                      <button
                        onClick={() =>
                          updateBookingStatus(selectedBooking, "no-show")
                        }
                        disabled={updating}
                        className="flex items-center justify-center gap-2 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-bold hover:bg-zinc-50 transition-colors disabled:opacity-50 col-span-2"
                      >
                        <AlertCircle size={18} />
                        Mark No-Show
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </Portal>
    </div>
  );
}
