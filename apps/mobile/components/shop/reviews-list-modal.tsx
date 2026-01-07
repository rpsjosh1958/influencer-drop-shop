import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { X, Star, MessageSquare } from "lucide-react-native";
import { H1, P } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: any;
  reply?: string;
  isAnonymous?: boolean;
}

interface ReviewsListModalProps {
  storeId: string;
  visible: boolean;
  onClose: () => void;
  storeStats: {
    rating: number;
    count: number;
    distribution: Record<string, number>;
  };
}

export function ReviewsListModal({
  storeId,
  visible,
  onClose,
  storeStats,
}: ReviewsListModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && storeId) {
      fetchReviews();
    }
  }, [visible, storeId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "stores", storeId, "reviews"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Review[];
      setReviews(items);
    } catch (error) {
      console.error("Failed to fetch reviews", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-zinc-100">
          <H1 className="text-xl font-black uppercase">Start Reviews</H1>
          <Pressable
            onPress={onClose}
            className="h-8 w-8 bg-zinc-100 rounded-full items-center justify-center"
          >
            <X size={20} color="black" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
          {/* Header Stats */}
          <View className="flex-row items-center gap-6 mb-8">
            <View className="items-center">
              <H1 className="text-5xl font-black tracking-tighter">
                {storeStats.rating.toFixed(1)}
              </H1>
              <View className="flex-row gap-1 my-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    fill={
                      star <= Math.round(storeStats.rating)
                        ? "black"
                        : "transparent"
                    }
                    color="black"
                  />
                ))}
              </View>
              <P className="text-xs text-zinc-400 font-bold uppercase">
                {storeStats.count} Reviews
              </P>
            </View>

            {/* Distribution Bars */}
            <View className="flex-1 gap-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = storeStats.distribution?.[star.toString()] || 0;
                const percentage =
                  storeStats.count > 0 ? (count / storeStats.count) * 100 : 0;
                return (
                  <View key={star} className="flex-row items-center gap-2">
                    <P className="text-[10px] font-bold w-3 text-right">
                      {star}
                    </P>
                    <View className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <View
                        className="h-full bg-black rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Reviews List */}
          {loading ? (
            <ActivityIndicator color="black" />
          ) : reviews.length === 0 ? (
            <View className="py-20 items-center">
              <MessageSquare size={48} color="#e4e4e7" />
              <P className="text-zinc-400 font-bold uppercase mt-4">
                No reviews yet
              </P>
            </View>
          ) : (
            <View className="gap-6">
              {reviews.map((review) => (
                <View key={review.id} className="bg-zinc-50 p-4 rounded-xl">
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <P className="font-bold text-sm">
                        {review.isAnonymous ? "Anonymous" : review.customerName}
                      </P>
                      <P className="text-[10px] text-zinc-400 font-bold uppercase">
                        Verified Customer
                      </P>
                    </View>
                    <P className="text-xs text-zinc-400 font-bold">
                      {formatDate(review.createdAt)}
                    </P>
                  </View>
                  <View className="flex-row gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={12}
                        fill={star <= review.rating ? "#fbbf24" : "#e4e4e7"}
                        color={star <= review.rating ? "#fbbf24" : "#e4e4e7"}
                      />
                    ))}
                  </View>
                  {review.comment && (
                    <P className="text-sm leading-relaxed">{review.comment}</P>
                  )}
                  {review.reply && (
                    <View className="mt-3 pt-3 border-t border-zinc-200 pl-3 border-l-2 border-l-zinc-300">
                      <P className="text-xs font-bold uppercase text-zinc-500 mb-1">
                        Store Reply
                      </P>
                      <P className="text-xs italic text-zinc-600">
                        {review.reply}
                      </P>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
