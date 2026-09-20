import { useState } from "react";
import { View, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "expo-router/react-navigation";
import { useRouter } from "expo-router";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Menu, Megaphone, Lock } from "lucide-react-native";
import { useVendor } from "@/context/vendor-context";
import { useAlert } from "@/context/alert-context";
import { H1, P } from "@/components/ui/text";

export default function BroadcastScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const { store } = useVendor();
  const { showAlert } = useAlert();

  const isGrowth = store?.plan === "growth";

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title || !message || !store?.id || sending) return;

    setSending(true);
    try {
      // Ownership + Growth-plan checks happen server-side in
      // broadcastToStoreCustomers (functions/src/broadcast.ts) — scoped
      // to this store's own past customers, never platform-wide.
      const broadcastToStoreCustomers = httpsCallable(
        functions,
        "broadcastToStoreCustomers"
      );
      const result = await broadcastToStoreCustomers({
        storeId: store.id,
        title,
        message,
      });
      const recipientCount =
        (result.data as { recipientCount?: number })?.recipientCount || 0;

      setTitle("");
      setMessage("");
      showAlert({
        title: "Broadcast sent!",
        message:
          recipientCount > 0
            ? `Sent to ${recipientCount} past customer${recipientCount === 1 ? "" : "s"}.`
            : "No past customers to notify yet.",
        type: "success",
        singleButton: true,
      });
    } catch (err) {
      console.error("Error sending broadcast:", err);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Failed to send broadcast. Please try again.";
      showAlert({ title: "Couldn't send broadcast", message: msg, type: "error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 bg-white flex-row items-center gap-3">
        <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Menu size={24} color="black" />
        </Pressable>
        <View>
          <H1 className="text-xl font-black uppercase">Broadcast</H1>
          <P className="text-xs text-zinc-400 font-bold">Message your past customers</P>
        </View>
      </View>

      {!isGrowth ? (
        <View className="flex-1 items-center justify-center px-10 gap-4">
          <View className="w-16 h-16 rounded-full bg-zinc-100 items-center justify-center">
            <Lock size={24} color="#a1a1aa" />
          </View>
          <P className="text-center font-black text-lg uppercase">
            Growth Plan Feature
          </P>
          <P className="text-center text-zinc-500">
            Broadcast sends a push notification to everyone who has bought
            from your store. Upgrade to Growth to unlock it.
          </P>
          <Pressable
            onPress={() => router.push("/(vendor)/billing")}
            className="bg-black py-4 px-8 rounded-2xl mt-2"
          >
            <P className="text-white font-black uppercase text-sm tracking-wide">
              Upgrade to Growth
            </P>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, gap: 20 }}
        >
          <View className="mb-4">
            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Title
            </P>
            <TextInput
              value={title}
              onChangeText={setTitle}
              className="bg-white border border-zinc-200 rounded-xl p-4 font-bold text-lg"
              placeholder="Message Title"
            />
          </View>

          <View className="mb-4">
            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Message
            </P>
            <TextInput
              value={message}
              onChangeText={setMessage}
              className="bg-white border border-zinc-200 rounded-xl p-4 font-medium text-base h-32"
              placeholder="Message Content"
              multiline
              textAlignVertical="top"
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={sending || !title || !message}
            className={`w-full bg-black py-4 rounded-2xl flex-row items-center justify-center gap-2 ${
              sending || !title || !message ? "opacity-40" : ""
            }`}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Megaphone size={18} color="#fff" />
            )}
            <P className="text-white font-black uppercase text-sm tracking-wide">
              {sending ? "Sending..." : "Send Broadcast"}
            </P>
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
