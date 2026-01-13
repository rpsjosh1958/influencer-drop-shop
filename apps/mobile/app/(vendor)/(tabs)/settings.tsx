import { View, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { router } from "expo-router";
import {
  LogOut,
  ArrowLeft,
  ExternalLink,
  Store,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import * as Linking from "expo-linking";

export default function VendorSettings() {
  const handleExit = () => {
    router.replace("/(tabs)/profile" as any);
  };

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut(auth);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100">
        <H1 className="text-2xl font-black uppercase">Settings</H1>
      </View>

      <ScrollView className="flex-1 p-6">
        <P className="text-xs font-bold text-zinc-400 uppercase mb-4 tracking-wider">
          Store Management
        </P>

        <SettingsItem
          icon={Store}
          label="Edit Store Profile"
          onPress={() => router.push("/(vendor)/edit-store" as any)}
          showChevron
        />
        <SettingsItem
          icon={Clock}
          label="Booking Policy"
          onPress={() => router.push("/(vendor)/availability" as any)}
          showChevron
        />

        <P className="text-xs font-bold text-zinc-400 uppercase mb-4 mt-6 tracking-wider">
          Account & System
        </P>

        <SettingsItem
          icon={ExternalLink}
          label="Open Web Dashboard"
          onPress={() =>
            Linking.openURL("https://thedrop-admin.vercel.app/admin")
          }
        />
        <SettingsItem
          icon={ArrowLeft}
          label="Exit Seller Mode"
          onPress={handleExit}
        />

        <View className="mt-8">
          <SettingsItem
            icon={LogOut}
            label="Sign Out"
            onPress={handleLogout}
            danger
          />
        </View>

        <P className="text-center text-zinc-300 text-xs mt-10 font-bold">
          Vendor App v1.0.0
        </P>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({
  icon: Icon,
  label,
  onPress,
  danger,
  showChevron,
}: any) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-4 p-4 rounded-2xl border mb-3 active:scale-[0.98] transition-all bg-white ${
        danger ? "border-red-100 bg-red-50/50" : "border-zinc-100"
      }`}
    >
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          danger ? "bg-red-100" : "bg-zinc-50"
        }`}
      >
        <Icon size={20} color={danger ? "#ef4444" : "#000"} />
      </View>
      <P
        className={`font-bold text-base flex-1 ${
          danger ? "text-red-500" : "text-black"
        }`}
      >
        {label}
      </P>
      {showChevron && <ChevronRight size={16} color="#d4d4d8" />}
    </Pressable>
  );
}
