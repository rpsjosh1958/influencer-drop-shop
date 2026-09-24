import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Pressable as NativePressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useState, useEffect } from "react";
import { useVendor } from "@/context/vendor-context";
import { useAlert } from "@/context/alert-context";
import { doc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { router } from "expo-router";
import { ArrowLeft, Save, Camera, Upload } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Custom Pressable to avoid conflict
const Pressable = NativePressable;

export default function EditStoreScreen() {
  const { showAlert } = useAlert();
  const { store } = useVendor();
  const [name, setName] = useState(store?.name || "");
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(store?.logo || null);
  const [uploading, setUploading] = useState(false);

  // Sync state if store loads late
  useEffect(() => {
    if (store) {
      if (!name) setName(store.name);
      if (store.logo && !logo) setLogo(store.logo);
    }
  }, [store]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0].uri);
      }
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Failed to pick image",
        type: "error",
        singleButton: true,
      });
    }
  };

  const uploadImage = async (uri: string) => {
    if (!store) return;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `stores/${store.id}/logo_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      setLogo(downloadURL);
    } catch (e) {
      console.error(e);
      showAlert({
        title: "Error",
        message: "Failed to upload image",
        type: "error",
        singleButton: true,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!store) return;
    if (!name.trim()) {
      showAlert({
        title: "Error",
        message: "Store name is required",
        type: "error",
        singleButton: true,
      });
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, "stores", store.id), {
        name: name.trim(),
        logo: logo,
      });
      showAlert({
        title: "Success",
        message: "Store profile updated",
        type: "success",
        singleButton: true,
      });
      router.back();
    } catch (e) {
      showAlert({
        title: "Error",
        message: "Failed to update profile",
        type: "error",
        singleButton: true,
      });
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
            
            {/* Logo Section */}
            <View className="items-center mb-8">
                <Pressable onPress={pickImage} disabled={uploading}>
                    <View className="w-24 h-24 rounded-full bg-zinc-100 border border-zinc-200 items-center justify-center overflow-hidden relative">
                        {logo ? (
                            <Image source={{ uri: logo }} className="w-full h-full" />
                        ) : (
                            <Camera size={32} color="#a1a1aa" />
                        )}
                        {uploading && (
                            <View className="absolute inset-0 bg-black/50 items-center justify-center">
                                <ActivityIndicator color="white" />
                            </View>
                        )}
                    </View>
                    <View className="absolute bottom-0 right-0 bg-black p-2 rounded-full border border-white">
                        <Upload size={12} color="white" />
                    </View>
                </Pressable>
                <P className="text-zinc-400 text-xs font-bold uppercase mt-3">Tap to change logo</P>
            </View>

            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Store Name
            </P>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg mb-6"
              placeholder="Enter store name"
            />

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <View className="p-6 border-t border-zinc-100">
        <Pressable
          onPress={handleSave}
          disabled={loading || uploading}
          className={`w-full bg-black py-4 rounded-2xl items-center justify-center flex-row gap-2 active:scale-[0.98] ${
              (loading || uploading) ? 'opacity-50' : ''
          }`}
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
