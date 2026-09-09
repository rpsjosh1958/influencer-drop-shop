import { View, Text } from "react-native";

// Matches the web admin's nav badge style exactly (AdminNavBadge in
// apps/web/src/components/admin/nav-badge.tsx): a red circular pill with
// the count, pushed to the end of the row — not text appended to the
// label like "Orders (3)".
export function DrawerLabelBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <View className="flex-row items-center justify-between flex-1">
      <Text style={{ color, fontWeight: "bold", fontSize: 15 }}>{label}</Text>
      {count > 0 && (
        <View className="bg-red-500 rounded-full min-w-[20px] h-5 px-1.5 items-center justify-center">
          <Text className="text-white text-[11px] font-bold">{count}</Text>
        </View>
      )}
    </View>
  );
}
