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
  Image,
  Pressable as NativePressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useState } from "react";
import { useVendor } from "@/context/vendor-context";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { router } from "expo-router";
import { ArrowLeft, Save, Camera, X, Plus } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Custom Pressable
const Pressable = NativePressable;

export default function AddProductScreen() {
  const { store } = useVendor();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

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
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const filename = `stores/${store.id}/products/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      setImages((prev) => [...prev, downloadURL]);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!name.trim() || !price || !stock) {
      Alert.alert("Error", "Name, Price, and Stock are required");
      return;
    }

    if (images.length === 0) {
      Alert.alert("Error", "Please add at least one image");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "stores", store.id, "products"), {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock: parseInt(stock),
        images: images,
        imageUrl: images[0], // Legacy support
        storeId: store.id,
        createdAt: serverTimestamp(),
        hasVariants: false, // Default for mobile simple add
      });

      Alert.alert("Success", "Product added successfully");
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">New Product</H1>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView className="flex-1 p-6">
            {/* Images Section */}
            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Product Images
            </P>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-6"
            >
              <Pressable
                onPress={pickImage}
                disabled={uploading}
                className="w-24 h-24 bg-zinc-50 border border-zinc-200 rounded-xl items-center justify-center mr-3 active:bg-zinc-100"
              >
                {uploading ? (
                  <ActivityIndicator color="black" />
                ) : (
                  <Plus size={24} color="#a1a1aa" />
                )}
              </Pressable>

              {images.map((img, index) => (
                <View key={index} className="w-24 h-24 mr-3 relative">
                  <Image
                    source={{ uri: img }}
                    className="w-full h-full rounded-xl bg-zinc-100"
                  />
                  <Pressable
                    onPress={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-black rounded-full p-1 border border-white"
                  >
                    <X size={12} color="white" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>

            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Product Name
            </P>
            <TextInput
              value={name}
              onChangeText={setName}
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg mb-6"
              placeholder="e.g. Vintage T-Shirt"
            />

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                  Price (GHS)
                </P>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg"
                  placeholder="0.00"
                />
              </View>
              <View className="flex-1">
                <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                  Stock
                </P>
                <TextInput
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="numeric"
                  className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg"
                  placeholder="0"
                />
              </View>
            </View>

            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Description
            </P>
            <TextInput
              value={description}
              onChangeText={setDescription}
              className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-medium text-base mb-6 h-32"
              placeholder="Describe your product..."
              multiline
              textAlignVertical="top"
            />

            <View className="h-10" />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <View className="p-6 border-t border-zinc-100">
        <Pressable
          onPress={handleSave}
          disabled={loading || uploading}
          className={`w-full bg-black py-4 rounded-2xl items-center justify-center flex-row gap-2 active:scale-[0.98] ${
            loading || uploading ? "opacity-50" : ""
          }`}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Save size={18} color="white" />
              <P className="text-white font-bold uppercase tracking-wider">
                Create Product
              </P>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
