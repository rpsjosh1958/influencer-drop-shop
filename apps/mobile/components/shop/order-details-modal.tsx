import { useState, useEffect } from "react";
import { View, ScrollView, Modal, Pressable, Image } from "react-native";
import {
  X,
  Package,
  MapPin,
  Calendar,
  CreditCard,
  BadgeCheck,
} from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "@/context/store-context";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReviewForm } from "./review-form";
import { Order } from "../../types";

interface OrderDetailsModalProps {
  order: Order | null;
  visible: boolean;
  onClose: () => void;
}

export function OrderDetailsModal({
  order,
  visible,
  onClose,
}: OrderDetailsModalProps) {
  const { store } = useStore();
  const [fetchedStoreName, setFetchedStoreName] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    setReviewSubmitted(false); // Reset on new order open
    if (visible && order && !order.storeName && order.storeId) {
      getDoc(doc(db, "stores", order.storeId))
        .then((snap) => {
          if (snap.exists()) {
            setFetchedStoreName(snap.data().name);
          }
        })
        .catch((err) => console.log("Failed to fetch store name", err));
    } else {
      setFetchedStoreName("");
    }
  }, [visible, order]);

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
        return "bg-blue-50 text-blue-600 border-blue-100";
      default:
        return "bg-yellow-50 text-yellow-600 border-yellow-100";
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
                <View className="flex-row items-center gap-1 mb-1">
                  <P className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    {order?.storeName || fetchedStoreName || "Unknown Store"}
                  </P>
                  {store?.isVerified && (
                    <BadgeCheck size={12} color="#3b82f6" fill="white" />
                  )}
                </View>
                <H1 className="text-xl font-black uppercase">Order Details</H1>
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
              {/* Status Section */}
              <View className="flex-row items-center justify-between mb-8">
                <View className="flex-row items-center gap-3">
                  <View className="h-12 w-12 bg-zinc-50 rounded-full items-center justify-center border border-zinc-100">
                    <Package size={24} color="black" />
                  </View>
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase mb-1">
                      Status
                    </P>
                    <View
                      className={`px-3 py-1 rounded-full border self-start ${getStatusColor(
                        order.status
                      )}`}
                    >
                      <P
                        className={`text-xs font-bold uppercase ${
                          order.status === "paid" ||
                          order.status === "delivered" ||
                          order.status === "completed"
                            ? "text-green-600"
                            : order.status === "sent-out"
                            ? "text-blue-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {order.status}
                      </P>
                    </View>
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

              {/* Review Form Section */}
              {order &&
                (order.status === "delivered" ||
                  order.status === "completed") &&
                !order.hasReview &&
                !reviewSubmitted && (
                  <View className="mb-8">
                    <ReviewForm
                      order={order}
                      storeId={order.storeId}
                      onReviewSubmitted={() => setReviewSubmitted(true)}
                    />
                  </View>
                )}

              {/* Info Grid */}
              <View className="bg-zinc-50 p-5 rounded-2xl space-y-4 mb-8">
                <View className="flex-row items-center gap-3">
                  <Calendar size={18} color="#a1a1aa" />
                  <View>
                    <P className="text-xs text-zinc-400 font-bold uppercase">
                      Date Placed
                    </P>
                    <P className="font-semibold">
                      {formatDate(order.createdAt)}
                    </P>
                  </View>
                </View>
                {order.address && (
                  <View className="flex-row items-center gap-3 pt-4 border-t border-zinc-200">
                    <MapPin size={18} color="#a1a1aa" />
                    <View className="flex-1">
                      <P className="text-xs text-zinc-400 font-bold uppercase">
                        Shipping Address
                      </P>
                      <P className="font-semibold">
                        {order.address.city}, {order.address.country}
                      </P>
                      <P className="text-zinc-500 text-sm">
                        {order.address.street}
                      </P>
                    </View>
                  </View>
                )}
              </View>

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
                      <P className="text-zinc-500 text-sm">
                        Qty: {item.quantity}
                      </P>
                      <P className="font-semibold text-sm">
                        GHS {item.price.toFixed(2)}
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
