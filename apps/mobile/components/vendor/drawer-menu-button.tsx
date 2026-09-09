import { Pressable, View } from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Menu } from "lucide-react-native";
import { useVendor } from "@/context/vendor-context";

// Opens the vendor drawer, with a small red dot when there's a new
// order/booking/complaint waiting — the same counts already shown next to
// each drawer nav label, just also surfaced when the drawer is closed.
export function VendorDrawerMenuButton() {
  const navigation = useNavigation();
  const { badgeCounts } = useVendor();

  const hasNewAlerts =
    (badgeCounts?.orders || 0) +
      (badgeCounts?.bookings || 0) +
      (badgeCounts?.complaints || 0) >
    0;

  return (
    <Pressable
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
      className="relative"
    >
      <Menu size={24} color="black" />
      {hasNewAlerts && (
        <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />
      )}
    </Pressable>
  );
}
