import { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Pressable,
  Image,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { H1, P } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { SafeAreaView } from "react-native-safe-area-context";
import { WallOfDrops } from "@/components/landing/wall-of-drops";
import {
  Zap,
  ArrowRight,
  Store as StoreIcon,
  ChevronDown,
  Search,
  X,
  Check,
  BadgeCheck,
  User,
  Briefcase,
} from "lucide-react-native";
import { useStore } from "@/context/store-context";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { cn } from "@/lib/utils";

const { width } = Dimensions.get("window");

interface Store {
  id: string;
  name: string;
  logo?: string;
  isVerified?: boolean;
}

export default function Onboarding() {
  const router = useRouter();
  const { setStoreId } = useStore();

  // Store Selection State
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch stores on modal open
  useEffect(() => {
    if (isModalOpen && stores.length === 0) {
      const fetchStores = async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, "stores"),
            where("status", "==", "live"),
            where("plan", "==", "growth"),
          );
          const snapshot = await getDocs(q);
          const storeData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Store[];
          setStores(storeData);
        } catch (error) {
          console.error("Onboarding: Failed to fetch stores", error);
        } finally {
          setLoading(false);
        }
      };
      fetchStores();
    }
  }, [isModalOpen]);

  const handleSelectStore = (store: Store) => {
    setSelectedStore(store);
    setIsModalOpen(false);
  };

  const handleEnterStore = async () => {
    if (!selectedStore) return;

    setEntering(true);
    try {
      await setStoreId(selectedStore.id);
      await AsyncStorage.setItem("hasSeenOnboarding", "true");
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
    } finally {
      setEntering(false);
    }
  };

  const filteredStores = stores.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <View className="flex-1 bg-black">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background Component */}
      <WallOfDrops />

      <SafeAreaView className="flex-1 justify-between p-6">
        {/* Top Header */}
        <View className="flex-row items-center gap-2 self-center bg-white/10 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
          
        </View>

        {/* Main Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="w-full space-y-8"
        >
          <View className="space-y-2">
            <H1 className="text-white text-5xl font-black mb-4 text-center tracking-tighter leading-none">
              WELCOME TO{"\n"}
              <H1 className="text-transparent text-5xl font-black tracking-tighter leading-none text-purple-500">
                THE DROP.
              </H1>
            </H1>
            <P className="text-white text-center text-lg max-w-xs mb-4 mx-auto">
              HAVE A FUN SHOPPING EXPERIENCE!
            </P>
          </View>

          {/* Store Selector Dropdown */}
          <View className="space-y-4 w-full">
            <Pressable
              onPress={() => setIsModalOpen(true)}
              className="bg-white rounded-2xl p-4 mb-4 flex-row items-center justify-between h-16"
            >
              <View className="flex-row items-center gap-3 flex-1">
                {selectedStore?.logo ? (
                  <Image
                    source={{ uri: selectedStore.logo }}
                    className="h-10 w-10 rounded-full bg-white"
                  />
                ) : (
                  <View className="h-10 w-10 rounded-full bg-zinc-100 items-center justify-center">
                    <StoreIcon size={18} color="black" />
                  </View>
                )}
                <View className="flex-1">
                  {selectedStore ? (
                    <View className="flex-row items-center gap-1.5">
                      <P className="text-black font-bold text-lg">
                        {selectedStore.name}
                      </P>
                      {selectedStore.isVerified && (
                        <BadgeCheck size={14} color="#3b82f6" fill="white" />
                      )}
                    </View>
                  ) : (
                    <P className="text-black font-bold text-lg">
                      Select a Store
                    </P>
                  )}
                </View>
              </View>
              <ChevronDown size={20} color="black" />
            </Pressable>

            <Button
              title={entering ? "ENTERING..." : "ENTER STORE"}
              onPress={handleEnterStore}
              disabled={!selectedStore || entering}
              className="h-14 rounded-2xl"
              textClassName="text-lg"
              icon={!entering && <ArrowRight size={20} color="black" />}
            />

            {/* Divider */}
            <View className="flex-row items-center gap-4 py-2 mb-5">
              <View className="flex-1 h-px bg-zinc-700" />
              <P className="text-white text-xs uppercase tracking-widest">Or</P>
              <View className="flex-1 h-px bg-zinc-700" />
            </View>

            {/* Login Buttons */}
            <View className="space-y-3">
              <P className="text-white mb-5 text-center text-xs uppercase tracking-widest">
                Login as
              </P>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => router.push("/(auth)/login")}
                  className="flex-1 bg-white rounded-2xl p-4 flex-row items-center justify-center gap-2 h-14 active:bg-zinc-100"
                >
                  <User size={18} color="black" />
                  <P className="text-black font-bold text-sm uppercase tracking-wider">
                    Customer
                  </P>
                </Pressable>

                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/(auth)/login",
                      params: { intent: "vendor" },
                    })
                  }
                  className="flex-1 bg-purple-600/80 border border-purple-500/50 rounded-2xl p-4 flex-row items-center justify-center gap-2 h-14 active:bg-purple-700"
                >
                  <Briefcase size={18} color="white" />
                  <P className="text-white font-bold text-sm uppercase tracking-wider">
                    Vendor
                  </P>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* Footer */}
        <P className="text-white text-center text-xs py-4">© 2026 THE DROP.</P>
      </SafeAreaView>

      {/* Store Selection Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <BlurView intensity={20} tint="dark" className="flex-1">
            <Pressable
              className="flex-1"
              onPress={() => setIsModalOpen(false)}
            />

            <MotiView
              from={{ translateY: 300, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: "timing", duration: 300 }}
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden max-h-[80%]"
            >
              <View className="p-6 border-b border-zinc-100 flex-row items-center justify-between">
                <H1 className="text-xl">Select Store</H1>
                <Pressable
                  onPress={() => setIsModalOpen(false)}
                  className="bg-zinc-100 p-2 rounded-full"
                >
                  <X size={20} color="black" />
                </Pressable>
              </View>

              {loading ? (
                <View className="p-10 items-center justify-center">
                  <ActivityIndicator size="large" color="black" />
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
                          onPress={() => handleSelectStore(s)}
                          className={cn(
                            "flex-row items-center gap-4 p-4 rounded-xl mb-3 border",
                            selectedStore?.id === s.id
                              ? "bg-black border-black"
                              : "bg-zinc-50 border-zinc-50",
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
                                  selectedStore?.id === s.id
                                    ? "text-white"
                                    : "text-black",
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
                                selectedStore?.id === s.id
                                  ? "text-white"
                                  : "text-zinc-500",
                              )}
                            >
                              @{s.id}
                            </P>
                          </View>
                          {selectedStore?.id === s.id && (
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
    </View>
  );
}
