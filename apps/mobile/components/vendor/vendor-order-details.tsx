import { useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  Image,
  Alert,
  ActionSheetIOS,
  Platform,
  Linking,
} from "react-native";
import {
  X,
  Package,
  MapPin,
  User,
  Phone,
  MoreVertical,
  RotateCcw,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatCurrency } from "@/lib/format";
import type { Order, FirestoreTimestamp } from "@/types";

interface VendorOrderDetailsProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function VendorOrderDetails({
  order,
  visible,
  onClose,
  onUpdate,
}: VendorOrderDetailsProps) {
  const [updating, setUpdating] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  if (!order) return null;

  // Locked once the order has reached a terminal state — fulfillment
  // buttons are unrelated to refunds/cancellation but would otherwise stay
  // clickable and silently overwrite the status back to a shipping state
  // even though refundedAmount/refundStatus (the real source of truth) is
  // untouched. Matches the same fix already shipped on the web admin.
  const isTerminalStatus =
    order.status === "refunded" ||
    order.status === "partially_refunded" ||
    order.status === "cancelled";

  const refundedSoFar = order.refundedAmount || 0;
  const refundable = Math.max(0, order.total - refundedSoFar);
  const hasPendingRefund =
    order.refundStatus === "pending" || order.refundStatus === "processing";

  const formatDate = (timestamp: FirestoreTimestamp | undefined) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Matches the web admin's order status colors (getStatusColor in
  // apps/web/src/app/(admin)/admin/orders/page.tsx) — same color families,
  // -50/-600/-100 shades instead of web's -100/-700 to match this modal's
  // existing pill style.
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
      case "pending":
      case "paid":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "packaged":
        return "bg-yellow-50 text-yellow-600 border-yellow-100";
      case "sent-out":
        return "bg-purple-50 text-purple-600 border-purple-100";
      case "delivered":
        return "bg-green-50 text-green-600 border-green-100";
      case "refunded":
      case "partially_refunded":
        return "bg-red-50 text-red-600 border-red-100";
      default:
        return "bg-zinc-50 text-zinc-500 border-zinc-200";
    }
  };

  const statusOptions = [
    { label: "Open", value: "paid" },
    { label: "Packaged", value: "packaged" },
    { label: "Sent-Out", value: "sent-out" },
    { label: "Delivered", value: "delivered" },
    { label: "Cancel Order", value: "cancelled", destructive: true },
  ];

  const handleUpdateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      // Update Order Status — the customer notification (with the store
      // name) is sent server-side by onOrderStatusUpdated, which fires
      // automatically off this write. A second, client-side notification
      // used to be created here too, producing two "Order Delivered"
      // alerts for the same status change — one with the store name (the
      // server one) and one without (this one). Removed; the server one
      // is the single source of truth now, same as the web admin.
      await updateDoc(doc(db, "stores", order.storeId, "orders", order.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      onUpdate();
      Alert.alert("Success", `Order updated to ${newStatus}`);
    } catch (e) {
      Alert.alert("Error", "Failed to update status");
      console.error(e);
    } finally {
      setUpdating(false);
    }
  };

  const showStatusOptions = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...statusOptions.map((o) => o.label), "Cancel"],
          destructiveButtonIndex: statusOptions.findIndex((o) => o.destructive),
          cancelButtonIndex: statusOptions.length,
        },
        (index) => {
          if (index < statusOptions.length) {
            handleUpdateStatus(statusOptions[index].value);
          }
        }
      );
    } else {
      // Android Custom Picker Logic (Alert has 3 button limit)
      // We will trigger a state to show a custom view instead
      setShowStatusPicker(true);
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
        <View className="bg-white h-[90%] rounded-t-3xl overflow-hidden">
          <SafeAreaView edges={["bottom"]} className="flex-1">
            {/* Header */}
            <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
              <View>
                <View className="flex-row items-center gap-2">
                  <H1 className="text-xl font-black uppercase">
                    Order Management
                  </H1>
                  {order.paymentMethod === "manual" && (
                    <View className="px-2 py-0.5 rounded-md bg-zinc-100">
                      <P className="text-[10px] font-black uppercase text-zinc-500">
                        Manual
                      </P>
                    </View>
                  )}
                </View>
                <P className="text-zinc-400 text-xs font-bold tracking-wider">
                  #{order.id.slice(0, 8).toUpperCase()}
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
              {/* Status & Actions */}
              <View className="flex-row items-center justify-between mb-8">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 bg-zinc-50 rounded-full items-center justify-center border border-zinc-100">
                    <Package size={24} color="black" />
                  </View>
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                      Status
                    </P>
                    {isTerminalStatus ? (
                      <View
                        className={`px-4 py-2 rounded-full border flex-row items-center gap-2 ${getStatusColor(
                          order.status
                        )}`}
                      >
                        <P className="text-xs font-bold uppercase">
                          {order.status.replace("_", " ")}
                        </P>
                      </View>
                    ) : (
                      <Pressable
                        onPress={showStatusOptions}
                        className={`px-4 py-2 rounded-full border flex-row items-center gap-2 ${getStatusColor(
                          order.status
                        )}`}
                      >
                        <P className="text-xs font-bold uppercase">
                          {order.status}
                        </P>
                        <MoreVertical size={12} color="currentColor" />
                      </Pressable>
                    )}
                  </View>
                </View>
                <View className="items-end">
                  <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                    Total
                  </P>
                  <H1 className="text-2xl font-black">
                    {formatCurrency(order.total)}
                  </H1>
                </View>
              </View>

              {/* Dispute banner */}
              {order.disputeStatus === "open" && (
                <View className="flex-row items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                  <AlertTriangle size={18} color="#b45309" />
                  <P className="flex-1 text-amber-800 text-sm font-medium">
                    This order&apos;s charge has been disputed by the
                    customer. Respond on your Paystack dashboard within 16
                    hours or it will auto-resolve against you.
                  </P>
                </View>
              )}

              {/* Refund Section — hidden for manually-recorded orders,
                  which have no real Paystack transaction to refund.
                  Refunds can only be triggered from the web admin, so this
                  is informational + a handoff link, not a form. */}
              {order.paymentMethod !== "manual" && (
                <View className="mb-8">
                  <P className="text-xs text-zinc-400 font-bold uppercase mb-3 tracking-wider">
                    Refund
                  </P>
                  <View className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 space-y-3">
                    {refundedSoFar > 0 && (
                      <P className="text-sm font-medium text-zinc-600">
                        {formatCurrency(refundedSoFar)} refunded so far
                        {refundable > 0
                          ? ` — ${formatCurrency(refundable)} still refundable.`
                          : "."}
                      </P>
                    )}
                    {hasPendingRefund && (
                      <View className="flex-row items-center gap-2">
                        <Loader2 size={14} color="#b45309" />
                        <P className="text-sm font-bold text-amber-600">
                          Refund of{" "}
                          {formatCurrency(order.pendingRefundAmount || 0)} is
                          processing…
                        </P>
                      </View>
                    )}
                    {order.refundStatus === "needs-attention" && (
                      <P className="text-sm font-bold text-red-600">
                        This refund needs the customer&apos;s payout details —
                        handle it on the Paystack dashboard.
                      </P>
                    )}
                    {order.refundStatus === "failed" && (
                      <P className="text-sm font-bold text-red-600">
                        The last refund attempt failed. You can try again on
                        the web dashboard.
                      </P>
                    )}

                    <View className="bg-blue-50 p-3 rounded-xl flex-row items-start gap-2">
                      <RotateCcw size={16} color="#2563eb" className="mt-0.5" />
                      <P className="flex-1 text-blue-800 text-xs font-medium">
                        {refundable <= 0.005
                          ? "This order has been fully refunded."
                          : "Refunds aren't available in the mobile app yet — issue one from the Web Admin Dashboard (Orders)."}
                      </P>
                    </View>

                    <Pressable
                      onPress={() =>
                        Linking.openURL("https://copdrop.io/admin/orders")
                      }
                      className="w-full bg-black py-3 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90 transition-opacity"
                    >
                      <P className="text-white font-bold uppercase text-xs">
                        Manage Refunds on Web Dashboard
                      </P>
                      <ExternalLink size={14} color="white" />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Customer Info (Vendor Only) */}
              <View className="bg-zinc-50 p-5 rounded-2xl space-y-4 mb-8">
                <View className="flex-row items-center gap-3">
                  <User size={18} color="#a1a1aa" />
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase">
                      Customer
                    </P>
                    <P className="font-bold">{order.customerName || "Guest"}</P>
                    <P className="text-sm text-zinc-500">
                      {order.customerEmail}
                    </P>
                  </View>
                </View>
                {order.customerPhone && (
                  <View className="flex-row items-center gap-3 pt-4 border-t border-zinc-200">
                    <Phone size={18} color="#a1a1aa" />
                    <View>
                      <P className="text-xs text-zinc-400 font-bold uppercase">
                        Contact
                      </P>
                      <P className="font-semibold">{order.customerPhone}</P>
                    </View>
                  </View>
                )}
                  <View className="pt-4 border-t border-zinc-200">
                    <P className="text-xs text-zinc-400 font-bold uppercase">
                      Placed On
                    </P>
                    <P className="font-semibold">
                      {formatDate(order.createdAt)}
                    </P>
                  </View>
                {order.customerNote && (
                  <View className="flex-row items-start gap-3 pt-4 border-t border-zinc-200">
                     {/* Reuse Calendar or similar sizing placeholder */}
                     <View className="w-[18px]" /> 
                    <View className="flex-1">
                      <P className="text-xs text-zinc-400 font-bold uppercase">
                        Customer Note
                      </P>
                      <P className="font-medium text-black italic">
                        {`"${order.customerNote}"`}
                      </P>
                    </View>
                  </View>
                )}
              </View>

              {/* Shipping Address */}
              {order.shipping && (
                <View className="bg-zinc-50 p-5 rounded-2xl space-y-4 mb-8">
                  <View className="flex-row items-start gap-3">
                    <MapPin size={18} color="#a1a1aa" className="mt-1" />
                    <View>
                      <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                        Shipping Address
                      </P>
                      <P className="font-bold text-base mb-1">
                        {order.shipping.street}
                      </P>
                      <P className="text-zinc-500">
                        {order.shipping.city}
                        {order.shipping.zip ? `, ${order.shipping.zip}` : ""}
                      </P>
                      <P className="text-zinc-500">{order.shipping.country}</P>
                      {order.shipping.phone && (
                        <Pressable className="mt-2 flex-row items-center gap-2">
                          <Phone size={14} color="#2563eb" />
                          <P className="text-blue-600 font-bold">
                            {order.shipping.phone}
                          </P>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Items List */}
              <H1 className="text-lg font-bold mb-4">
                Items ({order.items.length})
              </H1>
              <View className="space-y-4">
                {order.items.map((item, i) => (
                  <View key={i} className="flex-row gap-4 mb-3">
                    <Image
                      source={{
                        uri: item.imageUrl || item.image || item.images?.[0],
                      }}
                      className="w-20 h-20 bg-zinc-100 rounded-xl"
                      resizeMode="cover"
                    />
                    <View className="flex-1 justify-center space-y-1">
                      <P className="font-bold text-base" numberOfLines={1}>
                        {item.name}
                      </P>
                      {item.selectedVariant && (
                        <P className="text-xs text-zinc-500 font-medium">
                          {item.selectedVariant.name}
                        </P>
                      )}
                      <P className="text-zinc-500 text-sm mt-1">
                        {item.quantity} x{" "}
                        {formatCurrency(item.selectedVariant?.price || item.price)}
                      </P>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>

      {/* Custom Status Picker for Android */}
      <Modal
        visible={showStatusPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/60 items-center justify-center p-6"
          onPress={() => setShowStatusPicker(false)}
        >
          <Pressable
            className="bg-white w-full max-w-sm rounded-3xl overflow-hidden p-6 shadow-xl"
            onPress={(e) => e.stopPropagation()}
          >
            <H1 className="text-center text-xl font-black uppercase mb-6">
              Update Status
            </H1>
            <View className="space-y-2">
              {statusOptions.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    handleUpdateStatus(opt.value);
                    setShowStatusPicker(false);
                  }}
                  className={`p-4 rounded-xl border border-zinc-100 ${
                    opt.destructive ? "bg-red-50 border-red-100" : "bg-zinc-50"
                  }`}
                >
                  <P
                    className={`text-center font-bold ${
                      opt.destructive ? "text-red-600" : "text-zinc-900"
                    }`}
                  >
                    {opt.label}
                  </P>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => setShowStatusPicker(false)}
              className="mt-4 bg-black p-4 rounded-xl"
            >
              <P className="text-center font-bold text-white">Cancel</P>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}
