import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Star, Send } from "lucide-react-native";
import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase"; // Verify path
import { Order } from "../types"; // Verify path

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
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a star rating.");
      return;
    }
    setSubmitting(true);

    try {
      // 1. Create Review
      await addDoc(collection(db, "stores", storeId, "reviews"), {
        orderId: order.id,
        customerId: order.userId || "guest",
        customerName: isAnonymous
          ? "Anonymous"
          : order.customerName || "Customer",
        isAnonymous,
        rating,
        comment,
        createdAt: serverTimestamp(),
      });

      // 2. Mark Order as Reviewed
      await updateDoc(doc(db, "stores", storeId, "orders", order.id), {
        hasReview: true,
      });

      Alert.alert("Success", "Thank you for your feedback!");
      onReviewSubmitted();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate your Experience</Text>
      <Text style={styles.subtitle}>
        Your feedback helps us improve and helps other customers.
      </Text>

      {/* Star Rating */}
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Star
              size={32}
              color={star <= rating ? "#FACC15" : "#E4E4E7"}
              fill={star <= rating ? "#FACC15" : "transparent"}
            />
          </TouchableOpacity>
        ))}
      </View>
      {rating > 0 && (
        <Text style={styles.ratingLabel}>
          {["Terrible", "Bad", "Okay", "Good", "Great"][rating - 1]}
        </Text>
      )}

      {/* Comment */}
      <TextInput
        value={comment}
        onChangeText={setComment}
        placeholder="Tell us more about your order..."
        placeholderTextColor="#A1A1AA"
        multiline
        style={styles.input}
      />

      {/* Anonymous Toggle */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setIsAnonymous(!isAnonymous)}
      >
        <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
          {isAnonymous && <View style={styles.checkboxInner} />}
        </View>
        <Text style={styles.checkboxLabel}>Review Anonymously</Text>
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting || rating === 0}
        style={[
          styles.submitButton,
          (submitting || rating === 0) && styles.disabledButton,
        ]}
      >
        {submitting ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Send size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.submitButtonText}>Publish</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FAFAFA",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F4F4F5",
    marginTop: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  subtitle: {
    fontSize: 14,
    color: "#71717A",
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 8,
  },
  starButton: {
    padding: 2,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#A1A1AA",
    marginBottom: 16,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E4E4E7",
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: "top",
    color: "#000",
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#A1A1AA",
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    borderColor: "#000",
    backgroundColor: "#000",
  },
  checkboxInner: {
    width: 8,
    height: 8,
    backgroundColor: "#FFF",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#52525B",
  },
  submitButton: {
    backgroundColor: "#000",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
