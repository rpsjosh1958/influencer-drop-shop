import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MessageSquare,
  Briefcase,
  AlertCircle,
} from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/context/store-context";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Booking,
  BookingStatus,
  AvailabilitySettings,
} from "../../../web/src/types";
import { differenceInHours, parseISO } from "date-fns";
import { useAlert } from "@/context/alert-context";

interface BookingDetailsModalProps {
  booking: (Booking & { storeName?: string }) | null;
  visible: boolean;
  onClose: () => void;
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; borderColor: string }
> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50",
    borderColor: "border-amber-100",
  },
  confirmed: {
    label: "Confirmed",
    color: "text-blue-600",
    bg: "bg-blue-50",
    borderColor: "border-blue-100",
  },
  completed: {
    label: "Completed",
    color: "text-green-600",
    bg: "bg-green-50",
    borderColor: "border-green-100",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600",
    bg: "bg-red-50",
    borderColor: "border-red-100",
  },
  "no-show": {
    label: "No Show",
    color: "text-zinc-600",
    bg: "bg-zinc-100",
    borderColor: "border-zinc-100",
  },
};

export function BookingDetailsModal({
  booking,
  visible,
  onClose,
}: BookingDetailsModalProps) {
  const { store } = useStore();
  const [fetchedStoreName, setFetchedStoreName] = useState("");
  const [cancellationHours, setCancellationHours] = useState(24);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showAlert } = useAlert();

  useEffect(() => {
    console.log(
      "BookingDetailsModal visible:",
      visible,
      "Booking:",
      booking?.id,
    );
    if (visible && booking) {
      // Fetch Store Name if missing
      if (!booking.storeName && booking.storeId) {
        getDoc(doc(db, "stores", booking.storeId))
          .then((snap) => {
            if (snap.exists()) {
              setFetchedStoreName(snap.data().name);
            }
          })
          .catch((err) => console.log("Failed to fetch store name", err));
      }

      // Fetch Cancellation Policy
      if (booking.storeId) {
        getDoc(
          doc(db, "stores", booking.storeId, "availability", "settings"),
        ).then((snap) => {
          if (snap.exists()) {
            const data = snap.data() as AvailabilitySettings;
            setCancellationHours(data.cancellationHours ?? 24);
          }
        });
      }
    } else {
      setFetchedStoreName("");
    }
  }, [visible, booking]);

  if (!booking) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const statusConfig = STATUS_CONFIG[booking.status];

  const canCancel = () => {
    if (booking.status !== "pending" && booking.status !== "confirmed")
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

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const executeCancel = async () => {
    if (!booking) return;
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

      // 2. Notify Admin (Store Owner)
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

      onClose();
      // Provide success feedback after closing
      setTimeout(() => {
        showAlert({
          title: "Success",
          message: "Booking cancelled successfully.",
          type: "success",
          singleButton: true,
        });
      }, 500);
    } catch (e) {
      console.error(e);
      showAlert({
        title: "Error",
        message: "Failed to cancel booking.",
        type: "error",
        singleButton: true,
      });
    } finally {
      setCancelling(false);
      setShowConfirm(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View className="flex-1 bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white h-[85%] rounded-t-3xl overflow-hidden">
          <SafeAreaView edges={["bottom"]} className="flex-1">
            {/* Header */}
            <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-1 mb-1">
                  <P className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {booking.storeName || fetchedStoreName || "Unknown Store"}
                  </P>
                </View>
                <H1 className="text-xl font-black uppercase">
                  Booking Details
                </H1>
                <P className="text-zinc-400 text-xs font-bold tracking-wider">
                  #{booking.id.slice(0, 8).toUpperCase()}
                </P>
              </View>
              <Pressable
                onPress={onClose}
                className="h-10 w-10 bg-zinc-100 rounded-full items-center justify-center active:scale-95 transition-transform"
              >
                <X size={20} color="black" />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 24 }}
            >
              {/* Status Section */}
              <View className="flex-row items-center justify-between mb-8">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 bg-zinc-50 rounded-full items-center justify-center border border-zinc-100">
                    <Briefcase size={24} color="black" />
                  </View>
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                      Status
                    </P>
                    <View
                      className={`px-3 py-1 rounded-full border self-start ${statusConfig.bg} ${statusConfig.borderColor}`}
                    >
                      <P
                        className={`text-xs font-bold uppercase ${statusConfig.color}`}
                      >
                        {statusConfig.label}
                      </P>
                    </View>
                  </View>
                </View>
                <View className="items-end">
                  <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                    Price
                  </P>
                  <H1 className="text-2xl font-black">
                    GHS {booking.servicePrice.toFixed(2)}
                  </H1>
                </View>
              </View>

              {/* Service Info */}
              <View className="bg-zinc-50 p-5 rounded-2xl mb-4">
                <P className="text-xs text-zinc-400 font-bold uppercase mb-2">
                  Service
                </P>
                <H1 className="text-lg font-bold mb-1">
                  {booking.serviceName}
                </H1>
                <P className="text-zinc-500 font-medium">
                  {booking.duration} minutes
                </P>
              </View>

              {/* Date & Time Grid */}
              <View className="flex-row gap-4 mb-4">
                <View className="flex-1 bg-zinc-50 p-5 rounded-2xl">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Calendar size={16} color="#a1a1aa" />
                    <P className="text-xs text-zinc-400 font-bold uppercase">
                      Date
                    </P>
                  </View>
                  <P className="font-bold">{formatDate(booking.date)}</P>
                </View>
                <View className="flex-1 bg-zinc-50 p-5 rounded-2xl">
                  <View className="flex-row items-center gap-2 mb-2">
                    <Clock size={16} color="#a1a1aa" />
                    <P className="text-xs text-zinc-400 font-bold uppercase">
                      Time
                    </P>
                  </View>
                  <P className="font-bold">
                    {booking.startTime} - {booking.endTime}
                  </P>
                </View>
              </View>

              {/* Customer Info */}
              <View className="bg-zinc-50 p-5 rounded-2xl space-y-4 mb-4">
                <P className="text-xs text-zinc-400 font-bold uppercase">
                  Your Details
                </P>
                <View className="space-y-3">
                  <View className="flex-row items-center gap-3">
                    <User size={16} color="#a1a1aa" />
                    <P className="font-medium">{booking.customerName}</P>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Phone size={16} color="#a1a1aa" />
                    <P className="font-medium text-zinc-600">
                      {booking.customerPhone}
                    </P>
                  </View>
                  <View className="flex-row items-center gap-3">
                    <Mail size={16} color="#a1a1aa" />
                    <P className="font-medium text-zinc-600">
                      {booking.customerEmail}
                    </P>
                  </View>
                </View>
              </View>

              {/* Notes */}
              {booking.customerNotes && (
                <View className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mb-6">
                  <View className="flex-row items-center gap-2 mb-2">
                    <MessageSquare size={16} color="#b45309" />
                    <P className="text-xs text-amber-700 font-bold uppercase">
                      Your Note
                    </P>
                  </View>
                  <P className="text-amber-900 leading-snug">
                    {booking.customerNotes}
                  </P>
                </View>
              )}

              {/* Cancel Button */}
              {canCancel() ? (
                <View className="mt-4 pb-8">
                  {showConfirm ? (
                    <View className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <P className="text-red-800 font-bold mb-3 text-center">
                        Are you sure you want to cancel? This action cannot be
                        undone.
                      </P>
                      <View className="flex-row gap-3">
                        <Pressable
                          onPress={() => setShowConfirm(false)}
                          disabled={cancelling}
                          className="flex-1 py-3 bg-white border border-red-200 rounded-lg items-center"
                        >
                          <P className="text-zinc-600 font-bold">No, Keep It</P>
                        </Pressable>
                        <Pressable
                          onPress={executeCancel}
                          disabled={cancelling}
                          className="flex-1 py-3 bg-red-600 rounded-lg items-center justify-center"
                        >
                          {cancelling ? (
                            <ActivityIndicator color="white" size="small" />
                          ) : (
                            <P className="text-white font-bold">Yes, Cancel</P>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Pressable
                        onPress={handleCancelClick}
                        className="w-full py-4 border border-red-200 bg-white rounded-xl items-center active:bg-red-50"
                      >
                        <P className="text-red-600 font-bold uppercase tracking-wider">
                          Cancel Booking
                        </P>
                      </Pressable>
                      <P className="text-center text-zinc-400 text-xs mt-3 px-4">
                        Cancellation is allowed up to {cancellationHours} hours
                        before your appointment.
                      </P>
                    </>
                  )}
                </View>
              ) : booking.status === "pending" ||
                booking.status === "confirmed" ? (
                <View className="mt-4 flex-row items-start gap-2 bg-zinc-50 p-4 rounded-xl pb-8">
                  <AlertCircle size={16} color="#71717a" className="mt-0.5" />
                  <P className="text-zinc-500 text-xs flex-1">
                    Cancellation isn&apos;t available for this booking (Policy:{" "}
                    {cancellationHours}h notice required). Please contact the
                    store directly.
                  </P>
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
