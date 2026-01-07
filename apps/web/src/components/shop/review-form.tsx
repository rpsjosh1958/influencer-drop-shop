"use client";

import { useState } from "react";
import { Star, Loader2, Send } from "lucide-react";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";

interface ReviewFormProps {
  order: Order;
  storeId: string;
  onReviewSubmitted: () => void;
}

export function ReviewForm({
  order,
  storeId,
  onReviewSubmitted,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      // 1. Create Review
      await addDoc(collection(db, "stores", storeId, "reviews"), {
        orderId: order.id,
        customerId: order.userId || "guest", // Ideally use real ID if auth
        customerName: isAnonymous
          ? "Anonymous"
          : order.customerName || "Customer",
        isAnonymous,
        rating,
        comment,
        createdAt: serverTimestamp(),
      });

      // 2. Mark Order as Reviewed
      // Note: We are assuming we can write to the order here.
      // Security rules should allow users to update 'hasReview' on their own orders.
      await updateDoc(doc(db, "stores", storeId, "orders", order.id), {
        hasReview: true,
      });

      onReviewSubmitted();
    } catch (err) {
      console.error(err);
      setError("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100 mt-6">
      <h3 className="font-bold text-lg mb-2">Rate your Experience</h3>
      <p className="text-zinc-500 text-sm mb-4">
        Your feedback helps us improve and helps other customers.
      </p>

      {/* Star Rating */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
          >
            <Star
              size={32}
              className={`${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-zinc-200 text-zinc-200"
              } transition-colors`}
            />
          </button>
        ))}
        <span className="text-sm font-bold ml-2 text-zinc-400">
          {rating > 0
            ? ["Terrible", "Bad", "Okay", "Good", "Great"][rating - 1]
            : ""}
        </span>
      </div>

      {/* Comment */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell us more about your order..."
        className="w-full h-24 p-4 rounded-xl border border-zinc-200 bg-white text-sm outline-none focus:ring-2 focus:ring-black mb-4 resize-none"
      />

      {/* Footer Actions */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="rounded border-zinc-300 text-black focus:ring-black"
          />
          Review Anonymously
        </label>

        <button
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}
          Publish
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-xs font-bold mt-3 text-center">
          {error}
        </p>
      )}
    </div>
  );
}
