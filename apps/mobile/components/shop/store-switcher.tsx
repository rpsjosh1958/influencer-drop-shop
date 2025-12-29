import {
  View,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { H1, P } from "@/components/ui/text";
import { useStore } from "@/context/store-context";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ChevronDown,
  Store as StoreIcon,
  Loader2,
  Check,
  X,
  Search,
  BadgeCheck,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface Store {
  id: string;
  name: string;
  logo?: string;
  isVerified?: boolean;
}

export function StoreSwitcher() {
  const { store, setStoreId, storeId } = useStore();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (isOpen && stores.length === 0) {
      const fetchStores = async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, "stores"),
            where("status", "==", "live"),
            where("plan", "==", "growth")
          );
          const snapshot = await getDocs(q);
          const storeData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Store[];
          setStores(storeData);
        } catch (error) {
          console.error("StoreSwitcher: Failed to fetch stores", error);
        } finally {
          setLoading(false);
        }
      };

      fetchStores();
    }
  }, [isOpen]);

  const handleSelect = async (newId: string) => {
    setIsOpen(false);
    if (newId !== storeId) {
      await setStoreId(newId);
    }
  };

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Pressable
        onPress={() => setIsOpen(true)}
        className="flex-row items-center gap-2 active:opacity-70"
      >
        {store?.logo ? (
          <Image
            source={{ uri: store.logo }}
            className="h-8 w-8 rounded-full bg-zinc-100"
          />
        ) : (
          <View
            className="h-8 w-8 rounded-full items-center justify-center"
            style={{ backgroundColor: store?.theme?.primaryColor || "black" }}
          >
            <StoreIcon size={14} color="white" />
          </View>
        )}
        <H1
          className="text-xl tracking-tighter uppercase"
          style={{ color: store?.theme?.primaryColor || "black" }}
        >
          {store?.name || "DROP."}
        </H1>
        {store?.isVerified && (
          <BadgeCheck size={16} color="#3b82f6" fill="white" />
        )}
        <ChevronDown size={16} color={store?.theme?.primaryColor || "black"} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <BlurView intensity={20} tint="dark" className="flex-1">
            <Pressable className="flex-1" onPress={() => setIsOpen(false)} />

            <MotiView
              from={{ translateY: 300, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: "timing", duration: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden max-h-[80%]"
            >
              <View className="p-6 border-b border-zinc-100 flex-row items-center justify-between">
                <H1 className="text-xl">Select Store</H1>
                <Pressable
                  onPress={() => setIsOpen(false)}
                  className="bg-zinc-100 p-2 rounded-full"
                >
                  <X size={20} color="black" />
                </Pressable>
              </View>

              {loading ? (
                <View className="p-10 items-center justify-center">
                  <Loader2 size={32} color="black" className="animate-spin" />
                </View>
              ) : (
                <>
                  {/* Search Bar */}
                  <View className="px-6 py-2">
                    <View className="flex-row items-center bg-zinc-100 rounded-xl px-3 py-3 gap-2">
                      <Search size={16} color="#a1a1aa" />
                      <TextInput
                        placeholder="Find a store..."
                        className="flex-1 font-medium text-base"
                        placeholderTextColor="#a1a1aa"
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                      />
                    </View>
                  </View>

                  {/* List */}
                  <ScrollView
                    contentContainerStyle={{
                      padding: 24,
                      paddingTop: 12,
                      paddingBottom: 48,
                    }}
                  >
                    {filteredStores.length === 0 ? (
                      <P className="text-center text-zinc-400 py-8">
                        No stores found.
                      </P>
                    ) : (
                      filteredStores.map((s) => (
                        <Pressable
                          key={s.id}
                          onPress={() => handleSelect(s.id)}
                          className={cn(
                            "flex-row items-center gap-4 p-4 rounded-xl mb-3 border",
                            s.id === storeId
                              ? "bg-black border-black"
                              : "bg-zinc-50 border-zinc-50"
                          )}
                        >
                          {s.logo ? (
                            <Image
                              source={{ uri: s.logo }}
                              className="w-10 h-10 rounded-full bg-white"
                            />
                          ) : (
                            <View className="w-10 h-10 rounded-full bg-zinc-200 items-center justify-center">
                              <StoreIcon size={16} color="black" />
                            </View>
                          )}
                          <View className="flex-1">
                            <View className="flex-row items-center gap-1.5">
                              <H1
                                className={cn(
                                  "text-base",
                                  s.id === storeId ? "text-white" : "text-black"
                                )}
                              >
                                {s.name}
                              </H1>
                              {s.isVerified && (
                                <BadgeCheck
                                  size={14}
                                  color="#3b82f6"
                                  fill="white"
                                />
                              )}
                            </View>

                            <P
                              className={cn(
                                "text-xs opacity-60",
                                s.id === storeId
                                  ? "text-white"
                                  : "text-zinc-500"
                              )}
                            >
                              @{s.id}
                            </P>
                          </View>
                          {s.id === storeId && (
                            <Check size={20} color="white" />
                          )}
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                </>
              )}
            </MotiView>
          </BlurView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
