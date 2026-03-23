import React, { useState } from "react";
import {
  View,
  Pressable,
  Modal,
  ScrollView,
  Text,
  ActivityIndicator,
  Platform,
} from "react-native";
import { H1, P } from "@/components/ui/text";
import { useVendor } from "@/context/vendor-context";
import {
  ChevronDown,
  Store as StoreIcon,
  Check,
  X,
  Lock,
  Plus,
  BadgeCheck,
} from "lucide-react-native";
import { BlurView } from "expo-blur";
import { MotiView } from "moti";
import { cn } from "@/lib/utils";
import { router } from "expo-router";

interface VendorStoreSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export function VendorStoreSwitcher({ visible, onClose }: VendorStoreSwitcherProps) {
  const { 
    store, 
    ownedStores, 
    switchStore, 
    userPlan, 
    activeStoreId 
  } = useVendor();

  const [isSwitching, setIsSwitching] = useState(false);

  const handleSelect = async (id: string, isLocked: boolean) => {
    if (isLocked) {
      onClose();
      router.push("/(vendor)/profile-settings"); 
      return;
    }
    setIsSwitching(true);
    await switchStore(id);
    onClose();
    setTimeout(() => setIsSwitching(false), 300); // reset after modal gone
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <BlurView intensity={20} tint="dark" className="flex-1">
          <Pressable className="flex-1" onPress={onClose} />

          <MotiView
            from={{ translateY: 300, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ type: "timing", duration: 300 }}
            className="bg-white dark:bg-zinc-900 rounded-t-[40px] overflow-hidden max-h-[80%] shadow-2xl"
          >
            <View className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex-row items-center justify-between">
              <View>
                <H1 className="text-2xl text-white uppercase tracking-tighter">Your Stores</H1>
                <P className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
                  {userPlan === 'growth' ? 'Growth Plan' : 'Starter Plan'}
                </P>
              </View>
              <Pressable
                onPress={onClose}
                className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full"
              >
                <X size={20} color="#71717a" />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{
                padding: 24,
                paddingBottom: 48,
              }}
            >
              {isSwitching ? (
                <View className="py-12 items-center justify-center">
                  <ActivityIndicator size="large" color="#000" />
                  <Text className="mt-4 font-bold text-zinc-500">Switching store...</Text>
                </View>
              ) : (
                ownedStores.map((s) => {
                  const isSelected = s.id === store?.id;
                  const isLocked = s.isLocked;

                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => handleSelect(s.id, !!isLocked)}
                      className={cn(
                        "flex-row items-center gap-4 p-5 rounded-[24px] mb-3 border-2 transition-all",
                        isSelected
                          ? "bg-zinc-900 border-zinc-900 dark:bg-white dark:border-white shadow-lg"
                          : "bg-zinc-50 border-zinc-50 dark:bg-zinc-800 dark:border-zinc-800",
                        isLocked && "opacity-50"
                      )}
                    >
                      <View className={cn(
                        "w-12 h-12 rounded-2xl items-center justify-center",
                        isSelected ? "bg-zinc-800 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700"
                      )}>
                        <StoreIcon size={20} color={isSelected ? 'white' : '#71717a'} />
                      </View>
                      
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <H1
                            className={cn(
                              "text-lg",
                              isSelected ? "text-white dark:text-zinc-900" : "text-black dark:text-white"
                            )}
                          >
                            {s.name}
                          </H1>
                          {s.plan === 'growth' && (
                            <BadgeCheck size={16} color="#3b82f6" fill="white" />
                          )}
                        </View>
                        <P
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest",
                            isSelected ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500"
                          )}
                        >
                          {s.plan === 'growth' ? 'Growth' : 'Starter'}
                        </P>
                      </View>

                      {isLocked ? (
                        <View className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
                          <Text className="text-[10px] font-black uppercase text-zinc-500">Locked</Text>
                          <Lock size={12} color="#71717a" />
                        </View>
                      ) : isSelected && (
                        <View className="bg-green-500 p-1.5 rounded-full">
                          <Check size={16} color="white" />
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}

              {/* Add New Store Button */}
              <Pressable
                onPress={() => {
                  onClose();
                  alert(userPlan === 'growth' 
                    ? "Launch New Store coming soon to mobile!" 
                    : "Upgrade to Growth to add more stores.");
                }}
                className={cn(
                  "flex-row items-center gap-4 p-5 rounded-[24px] border-2 border-dashed transition-all mt-2",
                  userPlan === 'growth'
                    ? "border-zinc-300 dark:border-zinc-700 active:bg-zinc-50"
                    : "border-zinc-200 dark:border-zinc-800 opacity-40"
                )}
              >
                <View className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 items-center justify-center">
                  <Plus size={24} color="#71717a" />
                </View>
                <View>
                  <H1 className="text-lg text-zinc-500">Add New Store</H1>
                  {userPlan !== 'growth' && (
                    <P className="text-[10px] font-black uppercase tracking-widest text-purple-500">
                      Growth Required
                    </P>
                  )}
                </View>
              </Pressable>
            </ScrollView>
          </MotiView>
        </BlurView>
      </View>
    </Modal>
  );
}
