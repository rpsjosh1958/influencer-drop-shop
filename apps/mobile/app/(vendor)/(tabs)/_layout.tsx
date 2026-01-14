import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { LayoutDashboard, Bell, Settings } from "lucide-react-native";
import { useNotifications } from "@/context/notification-context";

export default function VendorTabsLayout() {
  const { unreadCount } = useNotifications();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#f4f4f5",
          height: Platform.OS === "ios" ? 85 : 60,
          paddingBottom: Platform.OS === "ios" ? 30 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#a1a1aa",
        tabBarLabelStyle: {
          fontWeight: "bold",
          fontSize: 10,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }: { color: string }) => (
            <LayoutDashboard size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }: { color: string }) => (
            <Bell size={24} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }: { color: string }) => (
            <Settings size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
