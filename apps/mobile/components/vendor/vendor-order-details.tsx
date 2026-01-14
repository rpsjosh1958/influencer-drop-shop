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
} from "react-native";
import {
  X,
  Package,
  MapPin,
  Calendar,
  CreditCard,
  User,
  Phone,
  Mail,
  MoreVertical,
} from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  doc,
  updateDoc,
  Timestamp,
  addDoc,
  collection,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VendorOrderDetailsProps {
  order: any | null;
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

  if (!order) return null;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
      case "delivered":
      case "completed":
        return "bg-green-50 text-green-600 border-green-100";
      case "sent-out":
      case "shipped":
        return "bg-blue-50 text-blue-600 border-blue-100";
      case "cancelled":
        return "bg-red-50 text-red-600 border-red-100";
      default:
        return "bg-yellow-50 text-yellow-600 border-yellow-100";
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
      // 1. Update Order Status
      await updateDoc(doc(db, "stores", order.storeId, "orders", order.id), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });

      // 2. Send Notification (Optional but good UX)
      let title = "Order Update 📦";
      let message = `Your order #${order.id
        .slice(0, 5)
        .toUpperCase()} is now ${newStatus}.`;

      if (newStatus === "shipped") {
        title = "Order Shipped 🚚";
        message = "Your order is on its way!";
      } else if (newStatus === "delivered") {
        title = "Order Delivered 🎉";
        message = "Your order has been delivered. Enjoy!";
      } else if (newStatus === "cancelled") {
        title = "Order Cancelled ❌";
        message = "Your order has been cancelled.";
      }

      const targetUserId = order.userId || order.customerId;
      if (targetUserId) {
        await addDoc(collection(db, "notifications"), {
          userId: targetUserId,
          type: "order_update",
          title,
          message,
          read: false,
          createdAt: Timestamp.now(),
          orderId: order.id,
          storeId: order.storeId,
        });
      }

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
              handleUpdateStatus(o.value);
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
        <View className="bg-white h-[90%] rounded-t-3xl overflow-hidden">
          <SafeAreaView edges={["bottom"]} className="flex-1">
            {/* Header */}
            <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
              <View>
                <H1 className="text-xl font-black uppercase">
                  Order Management
                </H1>
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
                  </View>
                </View>
                <View className="items-end">
                  <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                    Total
                  </P>
                  <H1 className="text-2xl font-black">
                    GHS {order.total.toFixed(2)}
                  </H1>
                </View>
              </View>

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
                <View className="flex-row items-center gap-3 pt-4 border-t border-zinc-200">
                  <Calendar size={18} color="#a1a1aa" />
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase">
                      Placed On
                    </P>
                    <P className="font-semibold">
                      {formatDate(order.createdAt)}
                    </P>
                  </View>
                </View>
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
                {order.items.map((item: any, i: number) => (
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
                        {item.quantity} x GHS{" "}
                        {(item.selectedVariant?.price || item.price).toFixed(2)}
                      </P>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
