import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { VendorProvider, useVendor } from "@/context/vendor-context";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Calendar,
  Settings,
  Clock,
  Wallet,
  Share2,
} from "lucide-react-native";
import { useNotifications } from "@/context/notification-context";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DrawerContentScrollView,
  DrawerItemList,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { View, Text, ActivityIndicator } from "react-native";
import { P } from "@/components/ui/text";
import Constants from "expo-constants";
import { DrawerLabelBadge } from "@/components/vendor/drawer-label-badge";

export default function VendorLayoutWrapper() {
  return (
    <VendorProvider>
      <VendorLayout />
    </VendorProvider>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { store } = useVendor();
  const version = Constants.expoConfig?.version || "1.0.0";
  const isGrowth = store?.plan === "growth";

  return (
    <View className="flex-1 bg-black">
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 0 }}
      >
        {/* Header */}
        <View className="px-8 pt-16 pb-8">
          <Text className="text-3xl font-black uppercase tracking-widest text-white leading-tight">
            The Drop Admin.
          </Text>
        </View>

        {/* Menu Items */}
        <View className="flex-1 px-4">
          <DrawerItemList {...props} />
        </View>

        {/* Spacer */}
        <View className="h-10" />
      </DrawerContentScrollView>

      {/* Footer */}
      <View className="px-8 py-10 border-t border-black bg-black">
        <P className="font-bold text-xl mb-2 text-white">
          {store?.name || "My Store"}
        </P>
        <View className="flex-row items-center justify-between">
          <View
            className={`self-start px-3 py-1 rounded-full ${
              isGrowth ? "bg-white" : "bg-white"
            }`}
          >
            <P
              className={`text-[10px] font-black uppercase tracking-wider ${
                isGrowth ? "text-black" : "text-black"
              }`}
            >
              {store?.plan === "growth" ? "Growth Plan" : "Free Plan"}
            </P>
          </View>
          <P className="text-xs text-zinc-400 font-bold">v{version}</P>
        </View>
      </View>
    </View>
  );
}

function VendorLayout() {
  const { setMode } = useNotifications();
  const { badgeCounts, store, ownedStores, loading } = useVendor();
  const router = useRouter();
  // Tracks only the FIRST time loading resolves, not every subsequent
  // flip. `loading` legitimately goes true→false repeatedly for the
  // entire lifetime of this screen (pull-to-refresh, switching stores,
  // any query invalidation) — gating the early-return below on raw
  // `loading` unmounted the whole <Drawer> on every one of those, and a
  // remounted Drawer navigator always resets to its first screen
  // (Dashboard), discarding whatever screen the vendor had actually
  // navigated to. This was the cause of "tapping Products in the drawer
  // just shows the dashboard" — a refetch race right after navigating
  // flipped `loading` again and blew away the navigation state.
  const [initiallyResolved, setInitiallyResolved] = useState(false);

  const hasNoStores = !loading && ownedStores.length === 0;

  useEffect(() => {
    if (loading) return;
    setInitiallyResolved(true);

    if (hasNoStores) {
      // A signed-in user with zero owned stores landed here — most likely
      // a stale "appMode: vendor" left over from a previous account on
      // this device (see the logout fixes in vendor settings/profile).
      // Bounce back to the customer side instead of rendering an empty
      // vendor dashboard, and correct appMode so this doesn't recur.
      AsyncStorage.setItem("appMode", "customer");
      router.replace("/(tabs)");
      return;
    }

    setMode("vendor");
    AsyncStorage.setItem("appMode", "vendor");
  }, [loading, hasNoStores]);

  if (!initiallyResolved || hasNoStores) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  // Feature Logic
  const storeType = store?.type || "product";
  const hasProducts =
    store?.features?.hasProducts ??
    (storeType === "product" || storeType === "hybrid");
  const hasServices =
    store?.features?.hasServices ??
    (storeType === "service" || storeType === "hybrid");

  const baseDrawerItemStyle = {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  } as const;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={CustomDrawerContent}
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          drawerActiveTintColor: "#000",
          drawerActiveBackgroundColor: "#fff",
          drawerInactiveTintColor: "#fff",
          drawerLabelStyle: {
            fontWeight: "bold",
            marginLeft: 0,
            fontSize: 15,
          },
          drawerItemStyle: baseDrawerItemStyle,
          drawerIcon: () => (
            <View className="mr-[-8]">
              {/* We use the icon logic in screens, utilizing the props passed here implicitly via screen Options or component?
                 Actually drawerIcon prop in Screen options receives color/size.
                 The spacer is handled by labelStyle marginLeft or view wrapper.
              */}
            </View>
          ),
        }}
      >
        <Drawer.Screen
          name="(tabs)"
          options={{
            drawerLabel: "Dashboard",
            title: "Dashboard",
            drawerIcon: ({ color, size }) => (
              <LayoutDashboard size={22} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="orders"
          options={{
            drawerLabel: ({ color }) => (
              <DrawerLabelBadge
                label="Orders"
                count={badgeCounts?.orders || 0}
                color={color}
              />
            ),
            title: "Orders",
            drawerIcon: ({ color, size }) => (
              <ShoppingBag size={22} color={color} />
            ),
            drawerItemStyle: {
              ...baseDrawerItemStyle,
              display: hasProducts ? "flex" : "none",
            },
          }}
        />
        <Drawer.Screen
          name="inventory"
          options={{
            drawerLabel: "Products",
            title: "Products",
            drawerIcon: ({ color, size }) => (
              <Package size={22} color={color} />
            ),
            drawerItemStyle: {
              ...baseDrawerItemStyle,
              display: hasProducts ? "flex" : "none",
            },
          }}
        />
        <Drawer.Screen
          name="bookings"
          options={{
            drawerLabel: ({ color }) => (
              <DrawerLabelBadge
                label="Bookings"
                count={badgeCounts?.bookings || 0}
                color={color}
              />
            ),
            title: "Bookings",
            drawerIcon: ({ color, size }) => (
              <Calendar size={22} color={color} />
            ),
            drawerItemStyle: {
              ...baseDrawerItemStyle,
              display: hasServices ? "flex" : "none",
            },
          }}
        />
        <Drawer.Screen
          name="schedule-management"
          options={{
            drawerLabel: "Schedule Management",
            title: "Schedule Management",
            drawerIcon: ({ color, size }) => <Clock size={22} color={color} />,
            drawerItemStyle: {
              ...baseDrawerItemStyle,
              display: hasServices ? "flex" : "none",
            },
          }}
        />
        <Drawer.Screen
          name="finance"
          options={{
            drawerLabel: "Finance",
            title: "Finance",
            drawerIcon: ({ color, size }) => <Wallet size={22} color={color} />,
          }}
        />
        <Drawer.Screen
          name="share-store"
          options={{
            drawerLabel: "Share Store",
            title: "Share Store",
            drawerIcon: ({ color, size }) => <Share2 size={22} color={color} />,
          }}
        />

        {/* Hidden Routes */}
        <Drawer.Screen
          name="edit-store"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Edit Store",
          }}
        />
        <Drawer.Screen
          name="billing"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Billing & Plan",
          }}
        />
        <Drawer.Screen
          name="product-form"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Product Form",
          }}
        />
        <Drawer.Screen
          name="profile-settings"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Profile",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
