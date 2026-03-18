import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { X, Send, AlertCircle, User } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ComplaintModalProps {
  visible: boolean;
  onClose: () => void;
  storeId: string;
  user?: any;
  forcedTarget?: "store" | "platform";
}

export function ComplaintModal({
  visible,
  onClose,
  storeId,
  user,
  forcedTarget,
}: ComplaintModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<"store" | "platform">(
    forcedTarget || "store"
  );

  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    subject: "",
    message: "",
  });

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.subject ||
      !formData.message
    ) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    setLoading(true);

    const finalTarget = forcedTarget || target;

    try {
      await addDoc(collection(db, "stores", storeId, "complaints"), {
        storeId,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        target: finalTarget,
        status: "unread",
        createdAt: serverTimestamp(),
        userId: user?.uid || null,
      });

      Alert.alert("Success", "Complaint sent successfully.", [
        {
          text: "OK",
          onPress: () => {
            setFormData({
              name: user?.displayName || "",
              email: user?.email || "",
              phone: user?.phoneNumber || "",
              subject: "",
              message: "",
            });
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error("Error submitting complaint:", error);
      Alert.alert("Error", "Failed to submit complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLoggedIn = !!user;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleContainer}>
                <View style={styles.iconContainer}>
                  <AlertCircle size={20} color="#DC2626" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {forcedTarget === "platform"
                      ? "Report an Issue"
                      : "Submit Complaint"}
                  </Text>
                  <Text style={styles.headerSubtitle}>We&apos;re here to help.</Text>
                </View>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Target Selector (Hidden if forcedTarget is set) */}
              {!forcedTarget && (
                <View style={styles.targetSelector}>
                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      target === "store" && styles.targetButtonActive,
                    ]}
                    onPress={() => setTarget("store")}
                  >
                    <Text
                      style={[
                        styles.targetText,
                        target === "store" && styles.targetTextActive,
                      ]}
                    >
                      Store
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.targetButton,
                      target === "platform" && styles.targetButtonActive,
                    ]}
                    onPress={() => setTarget("platform")}
                  >
                    <Text
                      style={[
                        styles.targetText,
                        target === "platform" && styles.targetTextActive,
                      ]}
                    >
                      Platform
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {isLoggedIn ? (
                <View style={styles.loggedInBadge}>
                  <View style={styles.avatar}>
                    <User size={20} color="#71717A" />
                  </View>
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={styles.loggedInName}>{formData.name}</Text>
                      <View style={styles.pill}>
                        <Text style={styles.pillText}>Logged In</Text>
                      </View>
                    </View>
                    <Text style={styles.loggedInEmail}>{formData.email}</Text>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="John Doe"
                      value={formData.name}
                      onChangeText={(t) =>
                        setFormData({ ...formData, name: t })
                      }
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="john@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={formData.email}
                      onChangeText={(t) =>
                        setFormData({ ...formData, email: t })
                      }
                    />
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+233..."
                  keyboardType="phone-pad"
                  value={formData.phone}
                  onChangeText={(t) => setFormData({ ...formData, phone: t })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Subject</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Order #1234 Issue"
                  value={formData.subject}
                  onChangeText={(t) => setFormData({ ...formData, subject: t })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your issue..."
                  multiline
                  numberOfLines={4}
                  value={formData.message}
                  onChangeText={(t) => setFormData({ ...formData, message: t })}
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  loading && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Send size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>
                      Submit Complaint
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F4F5",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#18181B",
    textTransform: "uppercase",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#71717A",
    fontWeight: "500",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 24,
  },
  targetSelector: {
    flexDirection: "row",
    backgroundColor: "#F4F4F5",
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  targetButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  targetButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  targetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A1A1AA",
    textTransform: "uppercase",
  },
  targetTextActive: {
    color: "#18181B",
  },
  loggedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#F4F4F5",
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4E4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  loggedInName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#18181B",
  },
  loggedInEmail: {
    fontSize: 12,
    color: "#71717A",
  },
  pill: {
    backgroundColor: "#000",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  pillText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#fff",
    textTransform: "uppercase",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    color: "#A1A1AA",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F4F4F5",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "500",
    color: "#18181B",
    borderWidth: 1,
    borderColor: "#E4E4E7",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#F4F4F5",
  },
  submitButton: {
    backgroundColor: "#000",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
