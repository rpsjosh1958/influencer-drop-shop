import { View, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import {
  useNotifications,
  type Notification,
} from "@/context/notification-context";
import { Bell } from "lucide-react-native";
import { router, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { isToday, isYesterday, format as formatDate } from "date-fns";
import { VendorComplaintDetails } from "@/components/vendor/vendor-complaint-details";
import { getNotificationRoute } from "@/lib/notification-routing";
import { VendorDrawerMenuButton } from "@/components/vendor/drawer-menu-button";

const getDateLabel = (seconds?: number) => {
  if (!seconds) return "Unknown";
  const date = new Date(seconds * 1000);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return formatDate(date, "MMM d");
};

export default function VendorNotifications() {
  const { notifications, loading, refetch, markAsRead } = useNotifications();
  const [selectedComplaint, setSelectedComplaint] = useState<{
    id: string;
    storeId: string;
  } | null>(null);

  // notifications is already sorted desc by createdAt, so consecutive
  // same-day items naturally land in the same group with this single pass.
  const groupedNotifications = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    notifications.forEach((n) => {
      const label = getDateLabel(n.createdAt?.seconds);
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.label === label) {
        lastGroup.items.push(n);
      } else {
        groups.push({ label, items: [n] });
      }
    });
    return groups;
  }, [notifications]);

  const handlePress = async (n: Notification) => {
    if (!n.read) {
      await markAsRead(n.id);
    }

    if (n.type === "vendor_complaint") {
      // No dedicated route — opens a modal via local state instead.
      if (n.data?.id && n.data?.storeId) {
        setSelectedComplaint({ id: n.data.id, storeId: n.data.storeId });
      }
      return;
    }

    // Order/booking types route via type+id first, since the stored
    // `screen` value isn't always mobile-safe (some backend events, e.g.
    // refund/dispute updates, set a web admin path) or may be missing id.
    const route = getNotificationRoute(n);
    if (route) {
      router.push(route);
    } else if (n.data?.screen) {
      router.push(n.data.screen as Href);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center gap-3">
        <VendorDrawerMenuButton />
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
          groupedNotifications.map((group) => (
            <View key={group.label} className="mb-2">
              <P className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2 mt-1">
                {group.label}
              </P>
              {group.items.map((n) => (
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
                          ? n.createdAt.toDate().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Just now"}
                      </P>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
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
