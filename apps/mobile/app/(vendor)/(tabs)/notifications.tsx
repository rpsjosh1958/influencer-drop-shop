import { View, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useNotifications } from "@/context/notification-context";
import { Bell } from "lucide-react-native";

export default function VendorNotifications() {
  const { notifications, loading, refetch } = useNotifications();

  // Filter for store-relevant notifications if needed, or show all for the user
  const list = notifications;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100">
        <H1 className="text-2xl font-black uppercase">Alerts</H1>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
        contentContainerStyle={{ padding: 24 }}
      >
        {list.length === 0 ? (
          <View className="items-center justify-center py-20 opacity-50">
            <Bell size={40} color="#000" />
            <P className="mt-4 font-bold text-zinc-400">No new alerts</P>
          </View>
        ) : (
          list.map((n) => (
            <View
              key={n.id}
              className="mb-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100"
            >
              <View className="flex-row gap-3">
                <View className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                <View className="flex-1">
                  <P className="font-bold text-base mb-1">{n.title}</P>
                  <P className="text-zinc-500">{n.message}</P>
                  <P className="text-xs text-zinc-400 mt-2 font-bold uppercase">
                    {n.createdAt?.toDate
                      ? n.createdAt.toDate().toLocaleDateString()
                      : "Just now"}
                  </P>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
