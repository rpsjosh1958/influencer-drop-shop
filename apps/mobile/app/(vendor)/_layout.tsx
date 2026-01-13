import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { VendorProvider } from "@/context/vendor-context";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Calendar,
} from "lucide-react-native";

export default function VendorLayout() {
  return (
    <VendorProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Drawer
          screenOptions={{
            headerShown: false,
            drawerActiveTintColor: "#000",
            drawerActiveBackgroundColor: "#f4f4f5",
            drawerLabelStyle: {
              fontWeight: "bold",
              marginLeft: -20,
            },
          }}
        >
          <Drawer.Screen
            name="(tabs)"
            options={{
              drawerLabel: "Dashboard",
              title: "Dashboard",
              drawerIcon: ({
                color,
                size,
              }: {
                color: string;
                size: number;
              }) => <LayoutDashboard size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="orders"
            options={{
              drawerLabel: "Orders",
              title: "Orders",
              drawerIcon: ({
                color,
                size,
              }: {
                color: string;
                size: number;
              }) => <ShoppingBag size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="inventory"
            options={{
              drawerLabel: "Inventory",
              title: "Inventory",
              drawerIcon: ({
                color,
                size,
              }: {
                color: string;
                size: number;
              }) => <Package size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="bookings"
            options={{
              drawerLabel: "Bookings",
              title: "Bookings",
              drawerIcon: ({
                color,
                size,
              }: {
                color: string;
                size: number;
              }) => <Calendar size={size} color={color} />,
            }}
          />
          <Drawer.Screen
            name="edit-store"
            options={{
              drawerItemStyle: { display: "none" },
              title: "Edit Store",
            }}
          />
          <Drawer.Screen
            name="availability"
            options={{
              drawerItemStyle: { display: "none" },
              title: "Booking Policy",
            }}
          />
        </Drawer>
      </GestureHandlerRootView>
    </VendorProvider>
  );
}
