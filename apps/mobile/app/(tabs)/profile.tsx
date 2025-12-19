import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

export default function ProfileScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center p-4">
      <View className="h-24 w-24 bg-zinc-100 rounded-full mb-4" />
      <Text className="text-xl font-bold mb-8">
        @{auth.currentUser?.displayName || "Guest"}
      </Text>

      <Button
        title="SIGN OUT"
        variant="outline"
        className="w-full"
        onPress={() => signOut(auth)}
      />
    </SafeAreaView>
  );
}
