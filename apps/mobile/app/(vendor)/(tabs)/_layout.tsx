import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LayoutDashboard, Bell, Settings } from "lucide-react-native";
import { useNotifications } from "@/context/notification-context";

export default function VendorTabsLayout() {
  const { unreadCount } = useNotifications();
  const badgeValue = unreadCount > 0 ? unreadCount : undefined;
  // The app draws edge-to-edge (always on for Android in Expo SDK 54+), and
  // setting height/paddingBottom below stops React Navigation adding the
  // inset itself — so add it here, or the tabs sit under Android's
  // navigation bar.
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#f4f4f5",
          height: 58 + bottomPadding,
          paddingBottom: bottomPadding,
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
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => (
            <Bell size={24} color={color} />
          ),
          tabBarBadge: badgeValue,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <Settings size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
