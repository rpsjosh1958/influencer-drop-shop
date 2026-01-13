import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useState, useEffect } from "react";
import { useVendor } from "@/context/vendor-context";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";
import { ArrowLeft, Save } from "lucide-react-native";

export default function EditStoreScreen() {
  const { store } = useVendor();
  const [name, setName] = useState(store?.name || "");
  const [description, setDescription] = useState(store?.description || "");
  const [loading, setLoading] = useState(false);

  // Sync state if store loads late
  useEffect(() => {
    if (store) {
      if (!name) setName(store.name);
      if (!description) setDescription(store.description);
    }
  }, [store]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Store name is required");
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "stores", store.id), {
        name: name.trim(),
        description: description.trim(),
      });
      Alert.alert("Success", "Store profile updated");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">Edit Store</H1>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView className="flex-1 p-6">
            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Store Name
            </P>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg mb-6"
              placeholder="Enter store name"
            />

            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Description
            </P>
            <TextInput
              value={description}
              onChangeText={setDescription}
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-medium text-base mb-6 h-32"
              placeholder="Tell customers about your store..."
              multiline
              textAlignVertical="top"
            />

            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Logo & Banner
            </P>
            <View className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 mb-6">
              <P className="text-zinc-500 text-sm">
                Media editing is currently available only on the Web Dashboard.
              </P>
            </View>

            <View className="h-10" />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <View className="p-6 border-t border-zinc-100">
        <Pressable
          onPress={handleSave}
          disabled={loading}
          className="w-full bg-black py-4 rounded-2xl items-center justify-center flex-row gap-2 active:scale-[0.98]"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Save size={18} color="white" />
              <P className="text-white font-bold uppercase tracking-wider">
                Save Changes
              </P>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// Custom Pressable to avoid importing from react-native which might conflict name wise if I wasn't careful (but I am)
import { Pressable as NativePressable } from "react-native";
const Pressable = NativePressable;
