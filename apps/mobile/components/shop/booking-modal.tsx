import {
  Modal,
  View,
  ScrollView,
  Dimensions,
  Pressable,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { MotiView, MotiImage } from "moti";
import { H1, P } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import {
  X,
  BadgeCheck,
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react-native";
import { useState, useRef, useEffect, useMemo } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useStore } from "@/context/store-context";
import {
  ServiceItem,
  AvailabilitySettings,
  TimeSlot,
  Booking,
} from "../../../web/src/types";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import {
  format,
  addDays,
  startOfToday,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isBefore,
  isToday,
  parse,
  addMinutes,
  isAfter,
} from "date-fns";
import { useRouter } from "expo-router";
import { TextInput } from "react-native";
import { useAlert } from "@/context/alert-context";
import { formatCurrency } from "@/lib/format";

const { width } = Dimensions.get("window");

interface BookingModalProps {
  isVisible: boolean;
  onClose: () => void;
  service: ServiceItem | null;
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
  isVisible,
  onClose,
  service,
}: BookingModalProps) {
  const insets = useSafeAreaInsets();
  const { store } = useStore();
  const router = useRouter();
  const { showAlert } = useAlert();

  // Steps: 0=Date, 1=Time, 2=Info, 3=Review/Confirm
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Info Form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [availability, setAvailability] = useState<AvailabilitySettings | null>(
    null
  );
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

  // Reset state on open
  useEffect(() => {
    if (isVisible) {
      setStep(0);
      setSelectedDate(null);
      setSelectedSlot(null);
      setCurrentMonth(new Date()); // Reset calendar to today
      setCustomerName(auth.currentUser?.displayName || "");
      setCustomerEmail(auth.currentUser?.email || "");
      setCustomerPhone("");
      setNotes("");

      // Fetch Availability and User Info
      if (store?.id) {
        getDoc(doc(db, "stores", store.id, "availability", "settings")).then(
          (docSnap) => {
            if (docSnap.exists()) {
              setAvailability(docSnap.data() as AvailabilitySettings);
            }
          }
        );
      }
    }
  }, [isVisible, service, store?.id]);

  // Fetch Existing Bookings for Selected Date (for collision detection)
  useEffect(() => {
    if (!selectedDate || !store?.id) return;

    const fetchBookings = async () => {
      try {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        const q = query(
          collection(db, "stores", store.id, "bookings"),
          where("date", "==", dateKey),
          where("status", "in", ["pending", "confirmed"])
        );
        const snap = await getDocs(q);
        setExistingBookings(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking))
        );
      } catch (e) {
        console.error("Failed to fetch bookings", e);
      }
    };
    fetchBookings();
  }, [selectedDate, store?.id]);

  // Calendar Grid Days
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Check if a date is available
  const isDateAvailable = (date: Date): boolean => {
    if (!availability) return false;
    if (isBefore(date, startOfToday())) return false;

    const dateKey = format(date, "yyyy-MM-dd");
    if (availability.blockedDates?.includes(dateKey)) return false;

    const dayOfWeek = date.getDay();
    const dayName = DAYS_MAP[dayOfWeek];
    const daySchedule = availability.schedule?.[dayName];
    return daySchedule?.enabled && daySchedule.slots.length > 0;
  };

  // Generate Available Time Slots (with conflict checking)
  const availableSlots = useMemo(() => {
    if (!selectedDate || !availability || !service) return [];

    const dayOfWeek = selectedDate.getDay();
    const dayName = DAYS_MAP[dayOfWeek];
    const daySchedule = availability.schedule?.[dayName];

    if (!daySchedule?.enabled) return [];

    const slots: string[] = [];
    const serviceDuration = service.duration;

    // We assume simple 30min intervals logic from web or use slots directly if defined
    // Web implementation iterates logic:
    daySchedule.slots.forEach((timeSlot) => {
      let current = parse(timeSlot.start, "HH:mm", selectedDate);
      const end = parse(timeSlot.end, "HH:mm", selectedDate);

      // Loop until end of slot window
      while (
        isBefore(addMinutes(current, serviceDuration), end) ||
        format(addMinutes(current, serviceDuration), "HH:mm") === timeSlot.end
      ) {
        const slotStartTime = current;
        const slotEndTime = addMinutes(current, serviceDuration);
        const slotStartStr = format(slotStartTime, "HH:mm");

        // 1. Past check (if today)
        if (isToday(selectedDate)) {
          if (isBefore(current, new Date())) {
            current = addMinutes(current, 30);
            continue;
          }
        }

        // 2. Conflict Check
        const hasConflict = existingBookings.some((booking) => {
          const bookingStart = parse(booking.startTime, "HH:mm", selectedDate);
          const bookingEnd = parse(booking.endTime, "HH:mm", selectedDate);

          return (
            (isBefore(slotStartTime, bookingEnd) &&
              isAfter(slotEndTime, bookingStart)) ||
            format(slotStartTime, "HH:mm") === booking.startTime
          );
        });

        if (!hasConflict) {
          slots.push(slotStartStr);
        }

        current = addMinutes(current, 30); // Increment by 30 mins
      }
    });

    return slots;
  }, [selectedDate, availability, service, existingBookings]);

  const handleBook = async () => {
    if (!service || !selectedDate || !selectedSlot || !store) return;

    setLoading(true);
    try {
      const endTime = format(
        addMinutes(
          parse(selectedSlot, "HH:mm", selectedDate),
          service.duration
        ),
        "HH:mm"
      );

      const bookingData = {
        storeId: store.id,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        customerId: auth.currentUser?.uid || "guest",
        customerName,
        customerEmail,
        customerPhone,
        customerNotes: notes,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedSlot,
        endTime,
        duration: service.duration,
        status: "pending", // Or "confirmed" if no payment
        createdAt: serverTimestamp(),
      };

      // Create Booking
      const docRef = await addDoc(
        collection(db, "stores", store.id, "bookings"),
        bookingData
      );

      // Notification (Store Owner)
      await addDoc(collection(db, "notifications"), {
        userId: store.ownerId,
        type: "booking_new",
        title: "New Booking! 📅",
        message: `${customerName} booked ${service.name}`,
        isRead: false,
        createdAt: serverTimestamp(),
        metadata: { bookingId: docRef.id, storeId: store.id },
      });

      // Close modal first to avoid stacking issues on iOS
      onClose();

      // Small delay to allow modal to close animation to start/finish
      setTimeout(() => {
        showAlert({
          title: "Booking Confirmed!",
          message: "Your appointment has been scheduled.",
          type: "success",
          singleButton: true,
        });
      }, 500);
    } catch (error) {
      console.error("Booking error:", error);
      showAlert({
        title: "Error",
        message: "Failed to create booking. Please try again.",
        type: "error",
        singleButton: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  const images =
    service.images && service.images.length > 0
      ? service.images
      : [service.imageUrl || "https://via.placeholder.com/500"];

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <View className="flex-1 bg-white">
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 150 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Close Button */}
            <Pressable
              onPress={onClose}
              className="absolute top-4 right-4 z-50 bg-white/80 p-2 rounded-full backdrop-blur-md"
            >
              <X color="black" size={24} />
            </Pressable>

            {/* Hero Image */}
            <View className="h-[250px] w-full bg-zinc-100 relative">
              <MotiImage
                source={{ uri: images[0] }}
                className="w-full h-full"
                style={{ resizeMode: "cover" }}
              />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute bottom-6 left-6 right-6">
                <View className="flex-row items-center gap-1 mb-2">
                  <BadgeCheck size={14} color="#3b82f6" fill="white" />
                  <P className="text-xs font-bold text-white uppercase tracking-widest">
                    {store?.name || "Service"}
                  </P>
                </View>
                <H1 className="text-3xl font-black text-white uppercase tracking-tighter leading-tight">
                  {service.name}
                </H1>
              </View>
            </View>

            {/* Content */}
            <View className="p-6">
              {/* Progress Stepper */}
              <View className="flex-row items-center justify-between mb-8">
                {["Date", "Time", "Info", "Confirm"].map((label, i) => (
                  <View key={label} className="flex-row items-center gap-2">
                    <View
                      className={`h-6 w-6 rounded-full items-center justify-center ${
                        step >= i ? "bg-black" : "bg-zinc-100"
                      }`}
                    >
                      <P
                        className={`text-[10px] font-bold ${
                          step >= i ? "text-white" : "text-zinc-400"
                        }`}
                      >
                        {i + 1}
                      </P>
                    </View>
                    {i < 3 && (
                      <View
                        className={`h-0.5 w-4 ${
                          step > i ? "bg-black" : "bg-zinc-100"
                        }`}
                      />
                    )}
                  </View>
                ))}
              </View>

              {/* Steps Content */}
              <MotiView
                animate={{ opacity: 1, translateY: 0 }}
                from={{ opacity: 0, translateY: 10 }}
              >
                {/* STEP 0: DATE SELECTION (CALENDAR) */}
                {step === 0 && (
                  <View>
                    <H1 className="text-2xl font-bold mb-2">Select a Date</H1>
                    <P className="text-zinc-500 mb-6">
                      Choose a day for your appointment.
                    </P>

                    {/* Month Navigation */}
                    <View className="flex-row items-center justify-between mb-4 bg-zinc-50 p-2 rounded-xl">
                      <Pressable
                        onPress={() =>
                          setCurrentMonth(subMonths(currentMonth, 1))
                        }
                        className="p-2 bg-white rounded-lg shadow-sm"
                      >
                        <ChevronLeft size={20} color="black" />
                      </Pressable>
                      <H1 className="text-base font-bold uppercase">
                        {format(currentMonth, "MMMM yyyy")}
                      </H1>
                      <Pressable
                        onPress={() =>
                          setCurrentMonth(addMonths(currentMonth, 1))
                        }
                        className="p-2 bg-white rounded-lg shadow-sm"
                      >
                        <ChevronRight size={20} color="black" />
                      </Pressable>
                    </View>

                    {/* Days Header */}
                    <View className="flex-row mb-2">
                      {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                        <View key={i} className="flex-1 items-center">
                          <P className="text-xs font-bold text-zinc-400">
                            {day}
                          </P>
                        </View>
                      ))}
                    </View>

                    {/* Calendar Grid */}
                    <View className="flex-row flex-wrap">
                      {calendarDays.map((day) => {
                        const isAvailable = isDateAvailable(day);
                        const isSelected = selectedDate
                          ? isSameDay(day, selectedDate)
                          : false;
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isTodayDate = isToday(day);

                        return (
                          <View
                            key={day.toISOString()}
                            className="w-[14.28%] aspect-square p-1"
                          >
                            <Pressable
                              disabled={!isAvailable || !isCurrentMonth}
                              onPress={() => {
                                setSelectedDate(day);
                                setSelectedSlot(null); // Reset slot
                              }}
                              className={`w-full h-full items-center justify-center rounded-xl border ${
                                !isCurrentMonth
                                  ? "border-transparent opacity-0" // Hide non-current month days? Or dim them. Let's dim.
                                  : isSelected
                                  ? "bg-black border-black"
                                  : !isAvailable
                                  ? "bg-zinc-50 border-transparent"
                                  : isTodayDate
                                  ? "bg-blue-50 border-blue-100"
                                  : "bg-white border-zinc-200"
                              } ${!isCurrentMonth ? "opacity-30" : ""}`}
                            >
                              <P
                                className={`text-xs font-bold ${
                                  isSelected
                                    ? "text-white"
                                    : !isAvailable
                                    ? "text-zinc-300 line-through"
                                    : isTodayDate
                                    ? "text-blue-600"
                                    : "text-black"
                                }`}
                              >
                                {format(day, "d")}
                              </P>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>

                    {!availability && (
                      <View className="mt-8 p-4 bg-yellow-50 rounded-xl items-center flex-row gap-3">
                        <Clock size={20} color="#b45309" />
                        <P className="text-yellow-700 font-bold text-xs flex-1">
                          This vendor has not set up their availability yet.
                        </P>
                      </View>
                    )}
                  </View>
                )}

                {/* STEP 1: TIME SELECTION */}
                {step === 1 && (
                  <View>
                    <H1 className="text-2xl font-bold mb-2">Select a Time</H1>
                    <P className="text-zinc-500 mb-6">
                      Available slots for{" "}
                      {selectedDate ? format(selectedDate, "MMMM do") : ""}.
                    </P>

                    {availableSlots.length === 0 ? (
                      <View className="p-8 items-center justify-center bg-zinc-50 rounded-2xl">
                        <Calendar size={32} color="#d4d4d8" />
                        <P className="text-center text-zinc-500 mt-4">
                          No slots available for this day. Please choose another
                          date.
                        </P>
                      </View>
                    ) : (
                      <View className="flex-row flex-wrap gap-3">
                        {availableSlots.map((slot) => (
                          <Pressable
                            key={slot}
                            onPress={() => setSelectedSlot(slot)}
                            className={`w-[31%] py-3 rounded-xl border items-center justify-center ${
                              selectedSlot === slot
                                ? "bg-black border-black"
                                : "bg-white border-zinc-200"
                            }`}
                          >
                            <P
                              className={`font-bold ${
                                selectedSlot === slot
                                  ? "text-white"
                                  : "text-black"
                              }`}
                            >
                              {slot}
                            </P>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* STEP 2: INFO FORM */}
                {step === 2 && (
                  <View>
                    <H1 className="text-2xl font-bold mb-2">Your Details</H1>
                    <P className="text-zinc-500 mb-6">
                      Let us know who&apos;s coming.
                    </P>

                    <View className="space-y-4">
                      <View className="mb-4">
                        <P className="text-xs font-bold uppercase text-zinc-500 mb-2">
                          Your Name
                        </P>
                        <View className="flex-row items-center px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200">
                          <User size={18} color="#a1a1aa" className="mr-3" />
                          <TextInput
                            value={customerName}
                            onChangeText={setCustomerName}
                            placeholder="Enter your name"
                            className="flex-1 font-medium ml-3"
                            placeholderTextColor="#a1a1aa"
                          />
                        </View>
                      </View>

                      <View className="mb-4">
                        <P className="text-xs font-bold uppercase text-zinc-500 mb-2">
                          Email
                        </P>
                        <View className="flex-row items-center px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200">
                          <Mail size={18} color="#a1a1aa" className="mr-3" />
                          <TextInput
                            value={customerEmail}
                            onChangeText={setCustomerEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            className="flex-1 font-medium ml-3"
                            placeholderTextColor="#a1a1aa"
                          />
                        </View>
                      </View>

                      <View className="mb-4">
                        <P className="text-xs font-bold uppercase text-zinc-500 mb-2">
                          Phone Number
                        </P>
                        <View className="flex-row items-center px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200">
                          <Phone size={18} color="#a1a1aa" className="mr-3" />
                          <TextInput
                            value={customerPhone}
                            onChangeText={setCustomerPhone}
                            placeholder="Enter phone number"
                            keyboardType="phone-pad"
                            className="flex-1 font-medium ml-3"
                            placeholderTextColor="#a1a1aa"
                          />
                        </View>
                      </View>

                      <View className="mb-4">
                        <P className="text-xs font-bold uppercase text-zinc-500 mb-2">
                          Notes (Optional)
                        </P>
                        <View className="flex-row items-start px-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200 h-24">
                          <FileText
                            size={18}
                            color="#a1a1aa"
                            className="mr-3 mt-1"
                          />
                          <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Any special requests?"
                            multiline
                            textAlignVertical="top"
                            className="flex-1 font-medium h-24 ml-3"
                            placeholderTextColor="#a1a1aa"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* STEP 3: CONFIRM */}
                {step === 3 && (
                  <View>
                    <H1 className="text-2xl font-bold mb-2">Confirm Booking</H1>
                    <P className="text-zinc-500 mb-6">
                      Review your appointment details.
                    </P>

                    <View className="bg-zinc-50 p-6 rounded-2xl space-y-4 mb-6">
                      <View className="flex-row justify-between items-start border-b border-zinc-200 pb-4">
                        <View>
                          <P className="text-xs font-bold uppercase text-zinc-400 mb-1">
                            Service
                          </P>
                          <H1 className="text-lg font-black">{service.name}</H1>
                        </View>
                        <View className="items-end">
                          <P className="text-xs font-bold uppercase text-zinc-400 mb-1">
                            Price
                          </P>
                          <H1 className="text-lg font-black">
                            {formatCurrency(service.price)}
                          </H1>
                        </View>
                      </View>

                      <View className="flex-row gap-4 mb-4 mt-3">
                        <View className="flex-1">
                          <P className="text-xs font-bold uppercase text-zinc-400 mb-1">
                            Date
                          </P>
                          <View className="flex-row items-center gap-2">
                            <Calendar size={16} color="black" />
                            <P className="font-bold">
                              {selectedDate
                                ? format(selectedDate, "EEE, MMM do")
                                : ""}
                            </P>
                          </View>
                        </View>
                        <View className="flex-1">
                          <P className="text-xs font-bold uppercase text-zinc-400 mb-1">
                            Time
                          </P>
                          <View className="flex-row items-center gap-2">
                            <Clock size={16} color="black" />
                            <P className="font-bold">{selectedSlot}</P>
                          </View>
                        </View>
                      </View>

                      <View>
                        <P className="text-xs font-bold uppercase text-zinc-400 mb-1">
                          Contact
                        </P>
                        <P className="font-medium">{customerName}</P>
                        <P className="text-zinc-500">{customerEmail}</P>
                        <P className="text-zinc-500">{customerPhone}</P>
                      </View>
                    </View>

                    <P className="text-xs text-center text-zinc-400">
                      By booking, you agree to the cancellation policy of{" "}
                      {store?.name}.
                    </P>
                  </View>
                )}
              </MotiView>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Bottom Bar - Now outside KAV so it stays at bottom (covered by keyboard) */}
      <MotiView
        from={{ translateY: 100 }}
        animate={{ translateY: 0 }}
        className="absolute bottom-0 left-0 right-0 justify-center items-center bg-white/90 border-t border-zinc-100 backdrop-blur-xl px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 20 }}
      >
        <View className="flex-row gap-3">
          {step > 0 && (
            <Button
              title="Back"
              onPress={() => setStep((s) => s - 1)}
              variant="outline"
              className="flex-1"
            />
          )}

          <Button
            title={
              loading
                ? "Processing..."
                : step === 0
                ? selectedDate
                  ? "Continue"
                  : "Select Date"
                : step === 1
                ? selectedSlot
                  ? "Continue"
                  : "Select Time"
                : step === 2
                ? customerName && customerEmail
                  ? "Review"
                  : "Enter Details"
                : "Confirm Booking"
            }
            onPress={() => {
              if (step === 0 && selectedDate) setStep(1);
              else if (step === 1 && selectedSlot) setStep(2);
              else if (step === 2 && customerName && customerEmail) setStep(3);
              else if (step === 3) handleBook();
            }}
            disabled={
              loading ||
              (step === 0 && !selectedDate) ||
              (step === 1 && !selectedSlot) ||
              (step === 2 && (!customerName || !customerEmail))
            }
            className={step === 0 ? "flex-[2]" : "flex-[2]"}
          />
        </View>
      </MotiView>
    </Modal>
  );
}
