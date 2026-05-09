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
  Switch,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useVendor } from "@/context/vendor-context";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  ChevronDown,
  Trash2,
  RefreshCcw,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SelectionModal } from "@/components/ui/selection-modal";
import { useMountEffect } from "@/hooks/use-mount-effect";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDocs } from "firebase/firestore";

const Pressable = NativePressable;

// Types
interface ProductOption {
  id: string;
  name: string;
  values: string[]; // "S", "M", "L"
}

interface ProductVariant {
  id: string;
  name: string;
  options: Record<string, string>; // { Size: "S", Color: "Red" }
  price: number | string;
  stock: number | string;
}

export default function ProductFormScreen() {
  const { store } = useVendor();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams();
  const isEditing = !!id;

  // Basic Info
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState(""); // Global stock if no variants
  const [images, setImages] = useState<string[]>([]);
  const [category, setCategory] = useState("");

  // Variants & Options
  const [hasVariants, setHasVariants] = useState(false);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // UI State
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);

  // --- VARIANT LOGIC ---
  const handleSyncVariants = useCallback(() => {
    // Clean options for generation (trim spaces, remove empty)
    const validOptions = options
      .map((o) => ({
        ...o,
        values: o.values.map((v) => v.trim()).filter(Boolean),
      }))
      .filter((o) => o.name && o.values.length > 0);

    if (validOptions.length === 0) {
      setVariants([]);
      return;
    }

    const cartesian = (sets: string[][]) =>
      sets.reduce<string[][]>(
        (acc, set) => acc.flatMap((x) => set.map((y) => [...x, y])),
        [[]]
      );

    const values = validOptions.map((o) => o.values);
    const combinations = cartesian(values);

    const newVariants: ProductVariant[] = combinations.map((combo) => {
      const optionsMap: Record<string, string> = {};
      validOptions.forEach((opt, idx) => {
        optionsMap[opt.name] = combo[idx];
      });

      const variantName = combo.join(" / ");

      // Check existing to preserve price/stock
      const existing = variants.find((v) => {
        const keys = Object.keys(v.options || {});
        if (keys.length !== Object.keys(optionsMap).length) return false;
        return keys.every((k) => v.options[k] === optionsMap[k]);
      });

      if (existing) return existing;

      return {
        id: Date.now().toString() + Math.random().toString().slice(2, 6),
        name: variantName,
        options: optionsMap,
        stock: 0,
        price: parseFloat(price || "0"), // Use base price
      };
    });

    setVariants(newVariants);
  }, [options, variants, price]);

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { id: Date.now().toString(), name: "", values: [] },
    ]);
  };

  const removeOption = (idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateOptionName = (idx: number, txt: string) => {
    const newOpts = [...options];
    newOpts[idx].name = txt;
    setOptions(newOpts);
  };

  const updateOptionValues = (idx: number, txt: string) => {
    const newOpts = [...options];
    // Allow raw typing including spaces and empty entries (for "S, ")
    newOpts[idx].values = txt.split(",");
    setOptions(newOpts);
  };

  const updateVariant = (id: string, field: "price" | "stock", val: string) => {
    setVariants((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          return { ...v, [field]: val };
        }
        return v;
      })
    );
  };

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // 1. Fetch Categories (TanStack Query Migration Pilot)
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const q = query(
        collection(db, "stores", store.id, "categories"),
        orderBy("name", "asc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        label: d.data().name,
        value: d.data().name,
      }));
    },
    enabled: !!store?.id,
  });

  // 2. Fetch Initial Data (If Edit)
  useEffect(() => {
    if (isEditing && store?.id) {
      const fetchProduct = async () => {
        try {
          const docRef = doc(db, "stores", store.id, "products", id as string);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setName(data.name || "");
            setDescription(data.description || "");
            setPrice(data.price?.toString() || "");
            setStock(data.stock?.toString() || "");
            setImages(data.images || (data.imageUrl ? [data.imageUrl] : []));
            setCategory(data.category || "");
            setHasVariants(data.hasVariants || false);
            setOptions(data.options || []);
            setVariants(data.variants || []);
          } else {
            Alert.alert("Error", "Product not found");
            router.back();
          }
        } catch (e) {
          Alert.alert("Error", "Failed to load product");
        } finally {
          setFetching(false);
        }
      };

      fetchProduct();
    } else if (!isEditing) {
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setImages([]);
      setCategory("");
      setHasVariants(false);
      setOptions([]);
      setVariants([]);
      setFetching(false);
    }
  }, [isEditing, store?.id, id]);

  // --- IMAGES ---
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
      Alert.alert("Error", "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // --- SAVE ---
  const handleSave = async () => {
    if (!name.trim() || !price) {
      Alert.alert("Missing Info", "Name and Price are required.");
      return;
    }
    if (images.length === 0) {
      Alert.alert("Missing Info", "Please add at least one image.");
      return;
    }
    if (hasVariants && variants.length === 0) {
      Alert.alert(
        "Missing Info",
        "Please configure variants or disable options."
      );
      return;
    }
    if (!hasVariants && !stock) {
      Alert.alert("Missing Info", "Please enter stock quantity.");
      return;
    }

    setLoading(true);
    try {
      const totalStock = hasVariants
        ? variants.reduce(
            (acc, v) =>
              acc + (typeof v.stock === "string" ? parseInt(v.stock) : v.stock),
            0
          )
        : parseInt(stock);

      const productData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        stock: totalStock,
        category,
        images,
        imageUrl: images[0],
        hasVariants,
        options: hasVariants
          ? options.map((o) => ({
              ...o,
              values: o.values.map((v) => v.trim()).filter(Boolean),
            }))
          : [],
        variants: hasVariants
          ? variants.map((v) => ({
              ...v,
              price:
                typeof v.price === "string" ? parseFloat(v.price) : v.price,
              stock: typeof v.stock === "string" ? parseInt(v.stock) : v.stock,
            }))
          : [],
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        await updateDoc(
          doc(db, "stores", store.id, "products", id as string),
          productData
        );
        Alert.alert("Success", "Product updated successfully");
      } else {
        await addDoc(collection(db, "stores", store.id, "products"), {
          ...productData,
          storeId: store.id,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Success", "Product created successfully");
      }

      // Invalidate query to force refresh on inventory screen
      queryClient.invalidateQueries({ queryKey: ["vendor-products", store.id] });
      
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="black" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">
          {isEditing ? "Edit Product" : "New Product"}
        </H1>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          className="flex-1 p-6"
          keyboardShouldPersistTaps="handled"
        >
            {/* Images */}
            <View className="mb-8">
              <P className="text-xs font-bold text-zinc-400 uppercase mb-3">
                Gallery
              </P>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  onPress={pickImage}
                  disabled={uploading}
                  className="w-24 h-24 bg-zinc-50 border border-zinc-200 rounded-xl items-center justify-center mr-3 active:bg-zinc-100"
                >
                  {uploading ? (
                    <ActivityIndicator color="black" size="small" />
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
            </View>

            {/* Core Info */}
            <View className="space-y-6">
              <View className="mb-4">
                <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                  Name
                </P>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg"
                  placeholder="Product Name"
                />
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1">
                  <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                    Price
                  </P>
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                    className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-bold text-lg"
                    placeholder="0.00"
                  />
                </View>

                {/* Global Stock (Only if no variants) */}
                {!hasVariants && (
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
                )}
              </View>

              <View className="mb-4">
                <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                  Category
                </P>
                <Pressable
                  onPress={() => setCategoryModalVisible(true)}
                  className="flex-row items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl p-4"
                >
                  <P
                    className={`font-bold ${
                      category ? "text-black" : "text-zinc-400"
                    }`}
                  >
                    {category || "Select Category"}
                  </P>
                  <ChevronDown size={20} color="#a1a1aa" />
                </Pressable>
              </View>

              <View>
                <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
                  Description
                </P>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 font-medium text-base h-32"
                  placeholder="Describe your product..."
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Separator */}
            <View className="h-[1px] bg-zinc-100 my-8" />

            {/* Variants Toggle */}
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <P className="font-bold text-lg">Options & Variants</P>
                <P className="text-zinc-400 text-xs">Size, Color, etc.</P>
              </View>
              <Switch
                value={hasVariants}
                onValueChange={setHasVariants}
                trackColor={{ false: "#e4e4e7", true: "#000" }}
                thumbColor={hasVariants ? "#fff" : "#000"}
                ios_backgroundColor="#e4e4e7"
              />
            </View>

            {/* TODO: VARIANTS BUILDER UI HERE */}
            {/* Variants Logic */}
            {hasVariants && (
              <View className="space-y-6">
                {/* Options Builder */}
                <View className="space-y-4">
                  {options.map((opt, idx) => (
                    <View
                      key={opt.id}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 mb-4"
                    >
                      <View className="flex-row justify-between mb-2">
                        <P className="text-xs font-bold text-zinc-400 uppercase">
                          Option {idx + 1}
                        </P>
                        <Pressable onPress={() => removeOption(idx)}>
                          <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                      </View>

                      <View className="gap-3">
                        <View>
                          <TextInput
                            value={opt.name}
                            onChangeText={(txt) => updateOptionName(idx, txt)}
                            placeholder="Option Name (e.g. Size)"
                            placeholderTextColor="#a1a1aa"
                            className="bg-white border text-zinc-900 border-zinc-200 rounded-lg p-3 font-bold text-sm"
                          />
                        </View>
                        <View>
                          <TextInput
                            value={opt.values.join(",")}
                            onChangeText={(txt) => updateOptionValues(idx, txt)}
                            placeholder="Values (e.g. S, M, L)"
                            placeholderTextColor="#a1a1aa"
                            className="bg-white border text-zinc-900 border-zinc-200 rounded-lg p-3 font-bold text-sm"
                          />
                          <P className="text-[10px] text-zinc-400 mt-1 ml-1">
                            Separate values with commas
                          </P>
                        </View>
                      </View>
                    </View>
                  ))}

                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={addOption}
                      className="flex-1 flex-row items-center justify-center p-3 border border-zinc-200 border-dashed rounded-xl bg-zinc-50 active:bg-zinc-100"
                    >
                      <Plus size={16} color="black" />
                      <P className="font-bold text-sm ml-2">Add Option</P>
                    </Pressable>

                    <Pressable
                      onPress={handleSyncVariants}
                      className="flex-1 flex-row items-center justify-center p-3 border border-zinc-200 border-dashed rounded-xl bg-zinc-50 active:bg-zinc-100"
                    >
                      <RefreshCcw size={16} color="black" />
                      <P className="font-bold text-sm ml-2">Sync Inventory</P>
                    </Pressable>
                  </View>
                </View>

                {/* Generated Variants List */}
                {variants.length > 0 && (
                  <View className="mt-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <P className="font-bold text-lg">Preview & Inventory</P>
                      <P className="text-[10px] text-zinc-400 font-bold uppercase">
                        {variants.length} Variants
                      </P>
                    </View>
                    {variants.map((v) => (
                      <View
                        key={v.id}
                        className="flex-row items-center bg-zinc-50 border border-zinc-100 p-3 rounded-xl mb-2 gap-3"
                      >
                        <View className="flex-1">
                          <P className="font-bold text-sm" numberOfLines={1}>
                            {v.name}
                          </P>
                        </View>

                        <View className="w-20">
                          <P className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                            Price
                          </P>
                          <TextInput
                            value={v.price?.toString()}
                            onChangeText={(txt) =>
                              updateVariant(v.id, "price", txt)
                            }
                            keyboardType="numeric"
                            className="bg-white border border-zinc-200 rounded-lg p-2 text-xs font-bold text-center"
                            placeholder="0.00"
                          />
                        </View>

                        <View className="w-20">
                          <P className="text-[10px] uppercase font-bold text-zinc-400 mb-1">
                            Stock
                          </P>
                          <TextInput
                            value={v.stock?.toString()}
                            onChangeText={(txt) =>
                              updateVariant(v.id, "stock", txt)
                            }
                            keyboardType="numeric"
                            className="bg-white border border-zinc-200 rounded-lg p-2 text-xs font-bold text-center"
                            placeholder="0"
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View className="h-20" />
          </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Save */}
      <View className="p-6 border-t border-zinc-100 bg-white">
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
                {isEditing ? "Save Changes" : "Create Product"}
              </P>
            </>
          )}
        </Pressable>
      </View>

      <SelectionModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        title="Select Category"
        options={categories}
        onSelect={(val) => setCategory(val)}
        selectedValue={category}
      />
    </SafeAreaView>
  );
}
