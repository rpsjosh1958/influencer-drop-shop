"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Loader2, User } from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Review } from "@/types";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface ReviewsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
}

export function ReviewsListModal({
  isOpen,
  onClose,
  storeId,
}: ReviewsListModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    rating: 0,
    count: 0,
    distribution: {} as any,
  });

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen || !storeId) return;

    async function fetchData() {
      setLoading(true);
      try {
        // 1. Fetch Store Stats
        const storeSnap = await getDoc(doc(db, "stores", storeId));
        if (storeSnap.exists()) {
          const data = storeSnap.data();
          setStats({
            rating: data.rating || 0,
            count: data.reviewCount || 0,
            distribution: data.ratingDistribution || {},
          });
        }

        // 2. Fetch Reviews
        const q = query(
          collection(db, "stores", storeId, "reviews"),
          orderBy("createdAt", "desc"),
          limit(50) // Cap at 50 for MVP
        );
        const snap = await getDocs(q);
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review)));
      } catch (err) {
        console.error("Error fetching reviews", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isOpen, storeId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none p-4"
          >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50 rounded-t-3xl">
                <div>
                  <h2 className="text-xl text-black tracking-tight">
                    STORE REVIEWS
                  </h2>
                  <p className="text-zinc-500 text-xs mt-1">
                    What customers are saying
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-zinc-300" size={32} />
                  </div>
                ) : (
                  <>
                    {/* Stats Summary */}
                    <div className="flex items-center gap-6 mb-8 bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                      <div className="text-center">
                        <div className="text-5xl text-black">
                          {stats.rating.toFixed(1)}
                        </div>
                        <div className="flex justify-center my-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              className={`${
                                star <= Math.round(stats.rating)
                                  ? "fill-black text-black"
                                  : "text-zinc-300"
                              } mx-0.5`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-zinc-500 font-bold">
                          {stats.count} reviews
                        </p>
                      </div>

                      <div className="flex-1 space-y-1">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = stats.distribution[star] || 0;
                          const percent =
                            stats.count > 0 ? (count / stats.count) * 100 : 0;
                          return (
                            <div
                              key={star}
                              className="flex items-center gap-2 text-xs"
                            >
                              <span className="font-bold text-black w-3">{star}</span>
                              <div className="flex-1 h-2 bg-zinc-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-black rounded-full"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Review List */}
                    <div className="space-y-4">
                      {reviews.length === 0 ? (
                        <div className="text-center py-10 text-zinc-400">
                          No reviews yet. Be the first to rate!
                        </div>
                      ) : (
                        reviews.map((review) => (
                          <div
                            key={review.id}
                            className="border-b border-zinc-100 last:border-0 pb-4 last:pb-0"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 bg-zinc-100 rounded-full flex items-center justify-center">
                                  <User size={14} className="text-zinc-400" />
                                </div>
                                <div>
                                  <p className="text-sm text-black font-bold">
                                    {review.isAnonymous
                                      ? "Anonymous"
                                      : review.customerName}
                                  </p>
                                  <p className="text-[10px] text-zinc-400">
                                    {review.createdAt
                                      ?.toDate()
                                      .toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    size={12}
                                    className={`${
                                      star <= review.rating
                                        ? "fill-black text-black"
                                        : "text-zinc-200"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-sm text-zinc-600 pl-10 leading-relaxed">
                                {review.comment}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
