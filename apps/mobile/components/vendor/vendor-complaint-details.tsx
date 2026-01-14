import { useEffect, useState } from "react";
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import {
  X,
  MessageSquare,
  Calendar,
  User,
  AlertCircle,
  ExternalLink,
} from "lucide-react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VendorComplaintDetailsProps {
  visible: boolean;
  onClose: () => void;
  complaintId: string | null;
  storeId: string | null;
}

export function VendorComplaintDetails({
  visible,
  onClose,
  complaintId,
  storeId,
}: VendorComplaintDetailsProps) {
  const [complaint, setComplaint] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && complaintId && storeId) {
      fetchComplaint();
    } else {
      setComplaint(null);
    }
  }, [visible, complaintId]);

  const fetchComplaint = async () => {
    if (!complaintId || !storeId) return;
    setLoading(true);
    try {
      const docRef = doc(db, "stores", storeId, "complaints", complaintId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setComplaint({ id: snap.id, ...snap.data() });
      }
    } catch (error) {
      console.error("Failed to fetch complaint", error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

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
                  Complaint Details
                </H1>
                <P className="text-zinc-400 text-xs font-bold tracking-wider">
                  #{complaintId?.slice(0, 8).toUpperCase()}
                </P>
              </View>
              <Pressable
                onPress={onClose}
                className="h-10 w-10 bg-zinc-100 rounded-full items-center justify-center active:scale-95 transition-transform"
              >
                <X size={20} color="black" />
              </Pressable>
            </View>

            {loading ? (
              <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="black" />
                <P className="mt-4 text-zinc-500 font-medium">
                  Loading details...
                </P>
              </View>
            ) : !complaint ? (
              <View className="flex-1 items-center justify-center px-8">
                <AlertCircle size={40} color="#d4d4d8" />
                <P className="text-center mt-4 text-zinc-500">
                  Complaint not found or deleted.
                </P>
              </View>
            ) : (
              <ScrollView
                className="flex-1"
                contentContainerStyle={{ padding: 24 }}
              >
                {/* Subject Card */}
                <View className="bg-red-50 p-5 rounded-2xl border border-red-100 mb-6">
                  <View className="flex-row items-center gap-2 mb-2">
                    <AlertCircle size={18} color="#dc2626" />
                    <P className="text-xs text-red-700 font-bold uppercase">
                      Subject
                    </P>
                  </View>
                  <H1 className="text-lg font-bold text-red-900">
                    {complaint.subject}
                  </H1>
                  <P className="text-red-700 mt-1 font-medium">
                    {complaint.type || "General Issue"}
                  </P>
                </View>

                {/* Message Body */}
                <View className="mb-8">
                  <P className="text-xs text-zinc-400 font-bold uppercase mb-3">
                    Description
                  </P>
                  <View className="bg-zinc-50 p-5 rounded-2xl">
                    <P className="text-base leading-6">
                      {complaint.description || complaint.message}
                    </P>
                  </View>
                </View>

                {/* Customer Info */}
                <View className="bg-zinc-50 p-5 rounded-2xl space-y-4 mb-8">
                  <P className="text-xs text-zinc-400 font-bold uppercase">
                    Submitted By
                  </P>
                  <View className="flex-row items-center gap-3">
                    <User size={18} color="#a1a1aa" />
                    <View>
                      <P className="font-bold">
                        {complaint.customerName || "Anonymous"}
                      </P>
                      <P className="text-sm text-zinc-500">
                        {complaint.customerEmail}
                      </P>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 pt-4 border-t border-zinc-200">
                    <Calendar size={18} color="#a1a1aa" />
                    <View>
                      <P className="text-xs text-zinc-400 font-bold uppercase">
                        Date
                      </P>
                      <P className="font-semibold">
                        {complaint.createdAt?.seconds
                          ? new Date(
                              complaint.createdAt.seconds * 1000
                            ).toLocaleDateString()
                          : "N/A"}
                      </P>
                    </View>
                  </View>
                </View>

                {/* Action Area */}
                <View className="mt-auto">
                  <View className="bg-blue-50 p-4 rounded-xl flex-row items-start gap-3 mb-4">
                    <MessageSquare
                      size={18}
                      color="#2563eb"
                      className="mt-0.5"
                    />
                    <P className="flex-1 text-blue-800 text-sm font-medium">
                      To ensure proper tracking and resolution, complaints must
                      be managed through the Web Admin Portal.
                    </P>
                  </View>

                  <Pressable
                    onPress={() =>
                      Linking.openURL("https://copdrop.io/admin/complaints")
                    }
                    className="w-full bg-black py-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90 transition-opacity"
                  >
                    <P className="text-white font-bold uppercase">
                      Resolve on Web Dashboard
                    </P>
                    <ExternalLink size={16} color="white" />
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
