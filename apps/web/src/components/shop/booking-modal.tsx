"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Check,
  User,
  Phone,
  Mail,
  MessageSquare,
} from "lucide-react";
import {
  ServiceItem,
  AvailabilitySettings,
  Booking,
  DaySchedule,
} from "@/types";
import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
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
  isBefore,
  addMinutes,
  parse,
  isAfter,
} from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface BookingModalProps {
  service: ServiceItem;
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
}

const DAYS_MAP: Record<number, keyof AvailabilitySettings["schedule"]> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

export function BookingModal({
  service,
  storeId,
  isOpen,
  onClose,
}: BookingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState<"date" | "time" | "info" | "confirm">(
    "date",
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Availability
  const [availability, setAvailability] = useState<AvailabilitySettings | null>(
    null,
  );
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

  // Selection
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Customer Info
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  // Fetch availability settings
  useEffect(() => {
    if (!isOpen || !storeId) return;
    setLoading(true);
    const fetchAvailability = async () => {
      try {
        const docRef = doc(db, "stores", storeId, "availability", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAvailability(docSnap.data() as AvailabilitySettings);
        }

        // Pre-fill user info if logged in
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCustomerName(userData.fullName || user.displayName || "");
            setCustomerEmail(userData.email || user.email || "");
            setCustomerPhone(userData.phone || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch availability", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [isOpen, storeId]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch existing bookings for selected date
  useEffect(() => {
    if (!selectedDate || !storeId) return;
    const fetchBookings = async () => {
      try {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        const q = query(
          collection(db, "stores", storeId, "bookings"),
          where("date", "==", dateKey),
          where("status", "in", ["pending", "confirmed"]),
        );
        const snap = await getDocs(q);
        setExistingBookings(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Booking),
        );
      } catch (err) {
        console.error("Failed to fetch bookings", err);
      }
    };
    fetchBookings();
  }, [selectedDate, storeId]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (!availability) return false;
    if (isBefore(date, new Date()) && !isToday(date)) return false;

    const dateKey = format(date, "yyyy-MM-dd");
    if (availability.blockedDates?.includes(dateKey)) return false;

    const dayOfWeek = date.getDay();
    const dayName = DAYS_MAP[dayOfWeek];
    const daySchedule = availability.schedule[dayName];
    return daySchedule?.enabled && daySchedule.slots.length > 0;
  };

  // Generate available time slots for selected date
  const availableSlots = useMemo(() => {
    if (!selectedDate || !availability) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayName = DAYS_MAP[dayOfWeek];
    const daySchedule = availability.schedule[dayName];

    if (!daySchedule?.enabled) return [];

    const slots: string[] = [];
    const serviceDuration = service.duration;
    const bufferTime = service.bufferTime || 0;
    const totalSlotTime = serviceDuration + bufferTime;

    daySchedule.slots.forEach((timeSlot) => {
      let current = parse(timeSlot.start, "HH:mm", selectedDate);
      const end = parse(timeSlot.end, "HH:mm", selectedDate);

      while (
        isBefore(addMinutes(current, serviceDuration), end) ||
        format(addMinutes(current, serviceDuration), "HH:mm") === timeSlot.end
      ) {
        const slotStart = format(current, "HH:mm");
        const slotEnd = format(addMinutes(current, serviceDuration), "HH:mm");

        // Check if slot is in the past (for today)
        if (isToday(selectedDate)) {
          const now = new Date();
          if (isBefore(current, now)) {
            current = addMinutes(current, 30);
            continue;
          }
        }

        // Check if slot conflicts with existing bookings
        const hasConflict = existingBookings.some((booking) => {
          const bookingStart = parse(booking.startTime, "HH:mm", selectedDate);
          const bookingEnd = parse(booking.endTime, "HH:mm", selectedDate);
          const slotStartTime = current;
          const slotEndTime = addMinutes(current, serviceDuration);

          return (
            (isBefore(slotStartTime, bookingEnd) &&
              isAfter(slotEndTime, bookingStart)) ||
            format(slotStartTime, "HH:mm") === booking.startTime
          );
        });

        if (!hasConflict) {
          slots.push(slotStart);
        }

        current = addMinutes(current, 30); // 30-minute intervals
      }
    });

    return slots;
  }, [selectedDate, availability, service, existingBookings]);

  const handleSubmit = async () => {
    if (
      !selectedDate ||
      !selectedSlot ||
      !customerName ||
      !customerPhone ||
      !customerEmail
    )
      return;
    setSubmitting(true);

    try {
      const endTime = format(
        addMinutes(
          parse(selectedSlot, "HH:mm", selectedDate),
          service.duration,
        ),
        "HH:mm",
      );

      const bookingData: Omit<Booking, "id"> = {
        storeId,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        customerId: auth.currentUser?.uid,
        customerName,
        customerPhone,
        customerEmail,
        customerNotes: customerNotes || undefined,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedSlot,
        endTime,
        duration: service.duration,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "stores", storeId, "bookings"), bookingData);
      setSuccess(true);
      setStep("confirm");
    } catch (err) {
      console.error("Failed to create booking", err);
      alert("Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep("date");
    setSelectedDate(null);
    setSelectedSlot(null);
    setCustomerNotes("");
    setSuccess(false);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={resetAndClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-xl font-bold">Book {service.name}</h2>
              <p className="text-sm text-zinc-500">
                {service.duration} min · {formatCurrency(service.price)}
              </p>
            </div>
            <button
              onClick={resetAndClose}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress */}
          <div className="px-5 py-3 border-b border-zinc-100 shrink-0">
            <div className="flex gap-2">
              {["date", "time", "info", "confirm"].map((s, i) => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    i <= ["date", "time", "info", "confirm"].indexOf(step)
                      ? "bg-black"
                      : "bg-zinc-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-zinc-400" size={32} />
              </div>
            ) : step === "date" ? (
              /* DATE SELECTION */
              <div>
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h3 className="text-lg font-bold">
                    {format(currentMonth, "MMMM yyyy")}
                  </h3>
                  <button
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>

                {/* Days Header */}
                <div className="grid grid-cols-7 mb-2">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <div
                      key={i}
                      className="text-center text-xs font-bold text-zinc-400 py-2"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day) => {
                    const isAvailable = isDateAvailable(day);
                    const isSelected =
                      selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                      <button
                        key={day.toISOString()}
                        disabled={!isAvailable || !isCurrentMonth}
                        onClick={() => {
                          setSelectedDate(day);
                          setSelectedSlot(null);
                        }}
                        className={`aspect-square rounded-xl transition-all text-sm font-medium ${
                          !isCurrentMonth
                            ? "text-zinc-200"
                            : !isAvailable
                              ? "text-zinc-300 cursor-not-allowed"
                              : isSelected
                                ? "bg-black text-white"
                                : isToday(day)
                                  ? "bg-blue-50 text-blue-600 hover:bg-blue-100"
                                  : "hover:bg-zinc-100"
                        }`}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>

                {!availability && (
                  <p className="text-center text-zinc-500 text-sm mt-6">
                    This vendor has not set up their availability yet.
                  </p>
                )}
              </div>
            ) : step === "time" ? (
              /* TIME SELECTION */
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={18} className="text-zinc-400" />
                  <span className="font-medium">
                    {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </span>
                </div>

                {availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="mx-auto text-zinc-300 mb-2" size={32} />
                    <p className="text-zinc-500">
                      No available slots for this date.
                    </p>
                    <button
                      onClick={() => setStep("date")}
                      className="mt-4 text-blue-600 font-medium hover:underline"
                    >
                      Choose another date
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-3 rounded-xl font-medium transition-all ${
                          selectedSlot === slot
                            ? "bg-black text-white"
                            : "bg-zinc-100 hover:bg-zinc-200"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : step === "info" ? (
              /* CUSTOMER INFO */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={18}
                    />
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Full name"
                      className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={18}
                    />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="054xxxxxxx"
                      className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Email *
                  </label>
                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      size={18}
                    />
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">
                    Notes (optional)
                  </label>
                  <div className="relative">
                    <MessageSquare
                      className="absolute left-3 top-3 text-zinc-400"
                      size={18}
                    />
                    <textarea
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Any special requests or notes..."
                      rows={3}
                      className="w-full pl-10 pr-4 py-3 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none resize-none"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="p-4 bg-zinc-50 rounded-2xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Service</span>
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Date</span>
                    <span className="font-medium">
                      {selectedDate && format(selectedDate, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Time</span>
                    <span className="font-medium">{selectedSlot}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-zinc-200">
                    <span className="text-zinc-500">Total</span>
                    <span className="font-bold">{formatCurrency(service.price)}</span>
                  </div>
                  <p className="text-xs text-zinc-400 pt-2">
                    * Payment will be collected at the appointment
                  </p>
                </div>
              </div>
            ) : (
              /* CONFIRMATION */
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="text-green-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Booking Confirmed!</h3>
                <p className="text-zinc-500 mb-6">
                  Your appointment has been submitted. The vendor will confirm
                  shortly.
                </p>

                <div className="p-4 bg-zinc-50 rounded-2xl text-left space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Service</span>
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Date</span>
                    <span className="font-medium">
                      {selectedDate &&
                        format(selectedDate, "EEEE, MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Time</span>
                    <span className="font-medium">{selectedSlot}</span>
                  </div>
                </div>

                <button
                  onClick={resetAndClose}
                  className="w-full py-3 bg-black text-white rounded-xl font-bold"
                >
                  Done
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== "confirm" && !loading && (
            <div className="p-5 border-t border-zinc-100 flex gap-3 shrink-0">
              {step !== "date" && (
                <button
                  onClick={() => {
                    if (step === "time") setStep("date");
                    if (step === "info") setStep("time");
                  }}
                  className="flex-1 py-3 border border-zinc-200 rounded-xl font-bold hover:bg-zinc-50 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (step === "date" && selectedDate) setStep("time");
                  if (step === "time" && selectedSlot) setStep("info");
                  if (step === "info") handleSubmit();
                }}
                disabled={
                  (step === "date" && !selectedDate) ||
                  (step === "time" && !selectedSlot) ||
                  (step === "info" &&
                    (!customerName || !customerPhone || !customerEmail)) ||
                  submitting
                }
                className="flex-1 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="animate-spin" size={18} />}
                {step === "info" ? "Confirm Booking" : "Continue"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
