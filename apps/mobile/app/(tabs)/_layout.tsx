import { Tabs } from "expo-router";
import { View, Pressable } from "react-native";
import { MotiView, MotiText } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_Config = [
  { name: "index", label: "Home", icon: "home" },
  { name: "orders", label: "Orders", icon: "receipt" },
  { name: "profile", label: "Profile", icon: "person" },
];

function TabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row bg-white border-t border-zinc-100 items-center justify-around absolute bottom-0 left-0 right-0 shadow-lg rounded-t-3xl"
      style={{
        paddingBottom: insets.bottom + 10,
        paddingTop: 15,
        height: 60 + insets.bottom,
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: -3,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 10,
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const config =
          TAB_Config.find((c) => c.name === route.name) || TAB_Config[0];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={index}
            onPress={onPress}
            className="items-center justify-center flex-1"
          >
            <MotiView
              animate={{
                scale: isFocused ? 1 : 0.9,
                translateY: isFocused ? -5 : 0,
              }}
              transition={{ type: "spring", damping: 15 }}
              className="items-center"
            >
              <Ionicons
                name={
                  isFocused
                    ? (config.icon as any)
                    : (`${config.icon}-outline` as any)
                }
                size={24}
                color={isFocused ? "black" : "#a1a1aa"}
              />
              {isFocused && (
                <MotiView
                  from={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="h-1 w-1 bg-black rounded-full mt-1"
                />
              )}
            </MotiView>
          </Pressable>
        );
      })}
    </View>
  );
}

import { useNotifications } from "@/context/notification-context";
import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TabLayout() {
  const { setMode } = useNotifications();

  useEffect(() => {
    setMode("customer");
    AsyncStorage.setItem("appMode", "customer");
  }, []);

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="orders" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
