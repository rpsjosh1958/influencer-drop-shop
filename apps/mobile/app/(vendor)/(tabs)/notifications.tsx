import { View, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useNotifications } from "@/context/notification-context";
import { Bell } from "lucide-react-native";
import { router } from "expo-router";
import { useState } from "react";
import { VendorComplaintDetails } from "@/components/vendor/vendor-complaint-details";

export default function VendorNotifications() {
  const { notifications, loading, refetch, markAsRead } = useNotifications();
  const [selectedComplaint, setSelectedComplaint] = useState<{
    id: string;
    storeId: string;
  } | null>(null);

  const handlePress = async (n: any) => {
    if (!n.read) {
      await markAsRead(n.id);
    }

    // Routing Logic
    if (n.type === "vendor_complaint") {
      // Open Modal by setting state
      if (n.data?.id && n.data?.storeId) {
        setSelectedComplaint({ id: n.data.id, storeId: n.data.storeId });
      }
    } else if (n.data?.screen) {
      router.push(n.data.screen as any);
    } else {
      // Fallback or Type-based routing
      if (n.type === "vendor_order") {
        router.push({
          pathname: "/(vendor)/orders",
          params: { orderId: n.data?.orderId || n.data?.id },
        } as any);
      } else if (n.type === "vendor_booking") {
        router.push({
          pathname: "/(vendor)/bookings",
          params: {
            bookingId: n.data?.bookingId || n.data?.id,
            date: n.data?.date,
          },
        } as any);
      }
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 flex-row justify-between items-center">
        <H1 className="text-2xl font-black uppercase">Alerts</H1>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        contentContainerStyle={{ padding: 24 }}
      >
        {notifications.length === 0 ? (
          <View className="items-center justify-center py-20 opacity-50">
            <Bell size={40} color="#000" />
            <P className="mt-4 font-bold text-zinc-400">No new alerts</P>
          </View>
        ) : (
          notifications.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => handlePress(n)}
              className={`mb-4 p-4 rounded-2xl border ${
                n.read
                  ? "bg-white border-zinc-100"
                  : "bg-blue-50 border-blue-100"
              }`}
            >
              <View className="flex-row gap-3">
                {!n.read && (
                  <View className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                )}
                <View className="flex-1">
                  <P
                    className={`font-bold text-base mb-1 ${
                      !n.read ? "text-blue-900" : "text-black"
                    }`}
                  >
                    {n.title}
                  </P>
                  <P
                    className={`${!n.read ? "text-blue-700" : "text-zinc-500"}`}
                  >
                    {n.message}
                  </P>
                  <P
                    className={`text-xs mt-2 font-bold uppercase ${
                      !n.read ? "text-blue-400" : "text-zinc-400"
                    }`}
                  >
                    {n.createdAt?.toDate
                      ? n.createdAt.toDate().toLocaleDateString()
                      : "Just now"}
                  </P>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <VendorComplaintDetails
        visible={!!selectedComplaint}
        complaintId={selectedComplaint?.id || null}
        storeId={selectedComplaint?.storeId || null}
        onClose={() => setSelectedComplaint(null)}
      />
    </SafeAreaView>
  );
}
