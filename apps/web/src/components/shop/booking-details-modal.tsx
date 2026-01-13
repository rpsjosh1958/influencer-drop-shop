"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  Loader2,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useShopUI } from "@/context/shop-ui-context";
import { Booking, BookingStatus, AvailabilitySettings } from "@/types";
import { format, parseISO, differenceInHours } from "date-fns";

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; description: string }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50",
    description: "Waiting for vendor confirmation",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-700",
    bg: "bg-blue-50",
    description: "Your appointment is confirmed",
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bg: "bg-green-50",
    description: "Service completed",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50",
    description: "Booking was cancelled",
  },
  "no-show": {
    label: "No Show",
    color: "text-zinc-700",
    bg: "bg-zinc-100",
    description: "Marked as no-show",
  },
};

export function BookingDetailsModal() {
  const {
    isBookingDetailsOpen,
    bookingDetailsId,
    bookingDetailsStoreId,
    closeBookingDetails,
  } = useShopUI();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [cancelling, setCancelling] = useState(false);

  useBodyScrollLock(isBookingDetailsOpen);

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingDetailsId || !bookingDetailsStoreId) return;
      setLoading(true);

      try {
        const docRef = doc(
          db,
          "stores",
          bookingDetailsStoreId,
          "bookings",
          bookingDetailsId
        );
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const bookingData = { id: snap.id, ...snap.data() } as Booking;
          setBooking(bookingData);

          // Fetch Cancellation Policy
          const settingsRef = doc(
            db,
            "stores",
            bookingDetailsStoreId,
            "availability",
            "settings"
          );
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            const data = settingsSnap.data() as AvailabilitySettings;
            setCancellationHours(data.cancellationHours ?? 24);
          }
        }
      } catch (error) {
        console.error("Failed to fetch booking:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isBookingDetailsOpen) {
      fetchBooking();
    } else {
      setBooking(null);
      setCancelling(false);
    }
  }, [isBookingDetailsOpen, bookingDetailsId, bookingDetailsStoreId]);

  const canCancel = () => {
    if (
      !booking ||
      (booking.status !== "pending" && booking.status !== "confirmed")
    )
      return false;

    try {
      const bookingDate = parseISO(booking.date);
      const [hours, minutes] = booking.startTime.split(":").map(Number);
      bookingDate.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const hoursDiff = differenceInHours(bookingDate, now);
      return hoursDiff >= cancellationHours;
    } catch (e) {
      return false;
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    if (
      !window.confirm(
        "Are you sure you want to cancel this booking? This action cannot be undone."
      )
    )
      return;

    setCancelling(true);
    try {
      // 1. Update Booking Status
      await updateDoc(
        doc(db, "stores", booking.storeId, "bookings", booking.id),
        {
          status: "cancelled",
          cancelledBy: "customer",
          updatedAt: serverTimestamp(),
        }
      );

      // 2. Notify Admin
      const storeSnap = await getDoc(doc(db, "stores", booking.storeId));
      if (storeSnap.exists()) {
        const storeData = storeSnap.data();
        await addDoc(collection(db, "notifications"), {
          userId: storeData.ownerId,
          type: "booking_cancelled",
          title: "Booking Cancelled ❌",
          message: `Customer ${booking.customerName} cancelled their appointment for ${booking.serviceName}.`,
          isRead: false,
          createdAt: serverTimestamp(),
          metadata: {
            bookingId: booking.id,
            storeId: booking.storeId,
            storeName: storeData.name,
          },
        });
      }

      setBooking((prev) => (prev ? { ...prev, status: "cancelled" } : null));
    } catch (e) {
      console.error(e);
      alert("Failed to cancel booking. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  if (!isBookingDetailsOpen) return null;

  return (
    <AnimatePresence>
      {isBookingDetailsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBookingDetails}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-black">
                    Booking Details
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Appointment Information
                  </p>
                </div>
              </div>
              <button
                onClick={closeBookingDetails}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="text-sm">Loading booking details...</span>
                </div>
              ) : !booking ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-3">
                  <Briefcase size={32} className="opacity-50" />
                  <span className="text-sm">Booking not found</span>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-2xl ${
                      STATUS_CONFIG[booking.status].bg
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span
                          className={`text-xs font-bold uppercase tracking-wide ${
                            STATUS_CONFIG[booking.status].color
                          }`}
                        >
                          {STATUS_CONFIG[booking.status].label}
                        </span>
                        <p
                          className={`text-sm mt-1 ${
                            STATUS_CONFIG[booking.status].color
                          } opacity-80`}
                        >
                          {STATUS_CONFIG[booking.status].description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Service Info */}
                  <div className="bg-zinc-50 rounded-2xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase font-bold tracking-wide mb-1">
                          Service
                        </p>
                        <h3 className="text-lg font-bold text-black">
                          {booking.serviceName}
                        </h3>
                        <p className="text-sm text-zinc-500 mt-1">
                          {booking.duration} minutes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-black">
                          GHS {booking.servicePrice}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Calendar size={14} />
                        <span className="text-xs font-bold uppercase">
                          Date
                        </span>
                      </div>
                      <p className="font-bold text-black">
                        {format(parseISO(booking.date), "EEE, MMM d")}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {format(parseISO(booking.date), "yyyy")}
                      </p>
                    </div>
                    <div className="bg-zinc-50 rounded-2xl p-4">
                      <div className="flex items-center gap-2 text-zinc-500 mb-2">
                        <Clock size={14} />
                        <span className="text-xs font-bold uppercase">
                          Time
                        </span>
                      </div>
                      <p className="font-bold text-black">
                        {booking.startTime}
                      </p>
                      <p className="text-xs text-zinc-500">
                        to {booking.endTime}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info (Your details) */}
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase font-bold tracking-wide">
                      Your Details
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                        <User size={16} className="text-zinc-400" />
                        <span className="text-sm font-medium text-black">
                          {booking.customerName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                        <Phone size={16} className="text-zinc-400" />
                        <span className="text-sm text-zinc-600">
                          {booking.customerPhone}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                        <Mail size={16} className="text-zinc-400" />
                        <span className="text-sm text-zinc-600">
                          {booking.customerEmail}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {booking.customerNotes && (
                    <div className="p-4 bg-amber-50 rounded-2xl">
                      <div className="flex items-center gap-2 text-amber-700 mb-2">
                        <MessageSquare size={14} />
                        <span className="text-xs font-bold uppercase">
                          Your Note
                        </span>
                      </div>
                      <p className="text-sm text-amber-900">
                        {booking.customerNotes}
                      </p>
                    </div>
                  )}

                  {/* Cancel Button */}
                  {canCancel() ? (
                    <div className="pt-2">
                      <button
                        onClick={handleCancel}
                        disabled={cancelling}
                        className="w-full py-3 bg-white border border-red-200 text-red-600 rounded-xl font-bold uppercase text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {cancelling && (
                          <Loader2 className="animate-spin" size={16} />
                        )}
                        {cancelling ? "Cancelling..." : "Cancel Booking"}
                      </button>
                      <p className="text-center text-zinc-400 text-xs mt-3 px-4">
                        Cancellation is allowed up to {cancellationHours} hours
                        before your appointment.
                      </p>
                    </div>
                  ) : booking.status === "pending" ||
                    booking.status === "confirmed" ? (
                    <div className="pt-2">
                      <div className="flex items-start gap-3 p-4 bg-zinc-50 rounded-xl">
                        <AlertCircle
                          size={16}
                          className="text-zinc-400 mt-0.5 shrink-0"
                        />
                        <p className="text-zinc-500 text-xs">
                          Cancellation isn't available for this booking (Policy:{" "}
                          {cancellationHours}h notice required). Please contact
                          the store directly.
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {/* Booking ID */}
                  <div className="pt-4 border-t border-zinc-100">
                    <p className="text-xs text-zinc-400 text-center">
                      Booking ID: #{booking.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
