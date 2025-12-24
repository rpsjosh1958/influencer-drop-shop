import { useState, useEffect } from "react";
import { View, Pressable, Image, Modal, ScrollView, Text } from "react-native";
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
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { cn } from "@/lib/utils";

interface Store {
  id: string;
  name: string;
  logo?: string;
}

export function StoreSwitcher() {
  const { store, setStoreId, storeId } = useStore();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen && stores.length === 0) {
      const fetchStores = async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, "stores"),
            where("status", "==", "live")
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
          <View className="h-8 w-8 bg-black rounded-full items-center justify-center">
            <StoreIcon size={14} color="white" />
          </View>
        )}
        <H1 className="text-xl tracking-tighter uppercase">
          {store?.name || "DROP."}
        </H1>
        <ChevronDown size={16} color="black" />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <BlurView intensity={20} tint="dark" className="flex-1">
          <Pressable className="flex-1" onPress={() => setIsOpen(false)} />

          <MotiView
            from={{ translateY: 300, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: "timing", duration: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl overflow-hidden max-h-[70%]"
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
              <ScrollView
                contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
              >
                {stores.map((s) => (
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
                      <H1
                        className={cn(
                          "text-base",
                          s.id === storeId ? "text-white" : "text-black"
                        )}
                      >
                        {s.name}
                      </H1>
                      <P
                        className={cn(
                          "text-xs opacity-60",
                          s.id === storeId ? "text-white" : "text-zinc-500"
                        )}
                      >
                        @{s.id}
                      </P>
                    </View>
                    {s.id === storeId && <Check size={20} color="white" />}
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </MotiView>
        </BlurView>
      </Modal>
    </>
  );
}
