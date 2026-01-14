import { useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
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
  MoreVertical,
} from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VendorBookingDetailsProps {
  booking: any | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function VendorBookingDetails({
  booking,
  visible,
  onClose,
  onUpdate,
}: VendorBookingDetailsProps) {
  const [loading, setLoading] = useState(false);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "text-blue-600 bg-blue-50 border-blue-100";
      case "completed":
        return "text-green-600 bg-green-50 border-green-100";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-100";
      case "no-show":
        return "text-zinc-600 bg-zinc-100 border-zinc-200";
      default:
        return "text-amber-600 bg-amber-50 border-amber-100";
    }
  };

  const statusOptions = [
    { label: "Confirm Booking", value: "confirmed" },
    { label: "Completed", value: "completed" },
    { label: "No Show", value: "no-show" },
    { label: "Cancel Booking", value: "cancelled", destructive: true },
  ];

  const handleStatusChange = async (newStatus: string) => {
    if (!booking) return;
    setLoading(true);
    try {
      await updateDoc(
        doc(db, "stores", booking.storeId, "bookings", booking.id),
        {
          status: newStatus,
          updatedAt: serverTimestamp(),
          ...(newStatus === "cancelled" ? { cancelledBy: "admin" } : {}),
        }
      );

      // Notifications
      if (newStatus === "cancelled") {
        await addDoc(collection(db, "notifications"), {
          userId: booking.customerId,
          type: "booking_cancelled_admin",
          title: "Booking Unavailable ❌",
          message: `Unfortunately, your appointment for ${
            booking.serviceName
          } on ${formatDate(
            booking.date
          )} is unavailable. Please reschedule at your convenience.`,
          isRead: false,
          createdAt: serverTimestamp(),
          metadata: { bookingId: booking.id, storeId: booking.storeId },
        });
      } else if (newStatus === "confirmed") {
        await addDoc(collection(db, "notifications"), {
          userId: booking.customerId,
          type: "booking_confirmed",
          title: "Booking Confirmed ✅",
          message: `Your appointment for ${booking.serviceName} is confirmed.`,
          isRead: false,
          createdAt: serverTimestamp(),
          metadata: { bookingId: booking.id, storeId: booking.storeId },
        });
      }

      onUpdate();
      Alert.alert("Success", `Booking updated to ${newStatus}`);
    } catch (e) {
      Alert.alert("Error", "Failed to update booking");
    } finally {
      setLoading(false);
    }
  };

  const showActionSheet = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...statusOptions.map((o) => o.label), "Cancel"],
          destructiveButtonIndex: statusOptions.findIndex((o) => o.destructive),
          cancelButtonIndex: statusOptions.length,
        },
        (idx) => {
          if (idx < statusOptions.length)
            handleStatusChange(statusOptions[idx].value);
        }
      );
    } else {
      Alert.alert(
        "Update Status",
        "Select new status",
        statusOptions
          .map((o) => ({
            text: o.label,
            style: (o.destructive ? "destructive" : "default") as
              | "destructive"
              | "default"
              | "cancel",
            onPress: () => {
              handleStatusChange(o.value);
            },
          }))
          .concat([{ text: "Cancel", style: "cancel", onPress: () => {} }])
      );
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white h-[85%] rounded-t-3xl overflow-hidden">
          <SafeAreaView edges={["bottom"]} className="flex-1">
            {/* Header */}
            <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
              <View>
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
              {/* Status */}
              <View className="flex-row items-center justify-between mb-8">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 bg-zinc-50 rounded-full items-center justify-center border border-zinc-100">
                    <Briefcase size={24} color="black" />
                  </View>
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                      Status
                    </P>
                    <Pressable
                      onPress={showActionSheet}
                      className={`px-4 py-2 rounded-full border flex-row items-center gap-2 ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      <P className="text-xs font-bold uppercase">
                        {booking.status}
                      </P>
                      <MoreVertical size={12} color="currentColor" />
                    </Pressable>
                  </View>
                </View>
                <View className="items-end">
                  <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                    Price
                  </P>
                  <H1 className="text-2xl font-black">
                    GHS {booking.servicePrice?.toFixed(2)}
                  </H1>
                </View>
              </View>

              {/* Date & Time */}
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

              {/* Customer Info */}
              <View className="bg-zinc-50 p-5 rounded-2xl space-y-4 mb-4">
                <P className="text-xs text-zinc-400 font-bold uppercase">
                  Customer Details
                </P>
                <View className="space-y-3">
                  <View className="flex-row items-center gap-3">
                    <User size={16} color="#a1a1aa" />
                    <P className="font-medium">{booking.customerName}</P>
                  </View>
                  <Pressable className="flex-row items-center gap-3">
                    <Phone size={16} color="#a1a1aa" />
                    <P className="font-medium text-blue-600 underline">
                      {booking.customerPhone}
                    </P>
                  </Pressable>
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
                      Customer Note
                    </P>
                  </View>
                  <P className="text-amber-900">{booking.customerNotes}</P>
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
