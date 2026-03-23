import { View, ScrollView, Pressable, Image, Alert, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useVendor } from "@/context/vendor-context";
import { H1, P } from "@/components/ui/text";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useState, useEffect } from "react";
import { Package, Clock, Plus, Menu } from "lucide-react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";
import { ServiceDetailsModal } from "@/components/vendor/service-details-modal";
import { formatCurrency } from "@/lib/format";

export default function VendorInventory() {
  const { store, products, loading, refreshStore } = useVendor();
  const [activeTab, setActiveTab] = useState<"products" | "services">(
    "products"
  );
  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!store?.id) return;
    const q = query(
      collection(db, "stores", store.id, "services"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setServices(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [store?.id]);

  const handleAdd = () => {
    if (activeTab === "products") {
      router.push("/(vendor)/product-form" as any);
    } else {
      Alert.alert(
        "Services",
        "Service creation is currently only available on the Web Dashboard."
      );
    }
  };

  const handleProductPress = (product: any) => {
    if (store?.status === "open") {
      Alert.alert(
        "Store is Open",
        "You must close your store before editing products."
      );
      return;
    }
    router.push({
      pathname: "/(vendor)/product-form",
      params: { id: product.id },
    } as any);
  };

  const handleServicePress = (service: any) => {
    setSelectedService(service);
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Menu size={24} color="black" />
          </Pressable>
          <H1 className="text-xl font-black uppercase">Inventory</H1>
        </View>
        <Pressable
          onPress={handleAdd}
          className="bg-black w-8 h-8 rounded-full items-center justify-center"
        >
          <Plus size={18} color="white" />
        </Pressable>
      </View>

      {/* Tabs */}
      <View className="px-6 py-4 flex-row gap-6">
        <Pressable onPress={() => setActiveTab("products")}>
          <P
            className={`text-lg font-bold ${
              activeTab === "products" ? "text-black" : "text-zinc-300"
            }`}
          >
            Products
          </P>
          {activeTab === "products" && (
            <View className="h-1 bg-black w-4 mt-1 rounded-full" />
          )}
        </Pressable>
        <Pressable onPress={() => setActiveTab("services")}>
          <P
            className={`text-lg font-bold ${
              activeTab === "services" ? "text-black" : "text-zinc-300"
            }`}
          >
            Services
          </P>
          {activeTab === "services" && (
            <View className="h-1 bg-black w-4 mt-1 rounded-full" />
          )}
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refreshStore} />
        }
      >
        {activeTab === "products"
          ? products.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => handleProductPress(p)}
                className="flex-row mb-4 bg-zinc-50 p-3 rounded-2xl border border-zinc-100 active:bg-zinc-100"
              >
                <Image
                  source={{
                    uri:
                      p.images?.[0] ||
                      p.imageUrl ||
                      "https://via.placeholder.com/150",
                  }}
                  className="w-20 h-20 rounded-xl bg-zinc-200"
                />
                <View className="flex-1 ml-4 justify-center">
                  <P className="font-bold text-base mb-1">{p.name}</P>
                  <P className="font-bold text-zinc-500">
                    {formatCurrency(p.price)}
                  </P>
                  <View className="flex-row items-center mt-2">
                    <View
                      className={`w-2 h-2 rounded-full ${
                        p.stock > 0 ? "bg-green-500" : "bg-red-500"
                      }`}
                    />
                    <P className="text-xs text-zinc-400 ml-2 font-bold uppercase">
                      {p.stock > 0 ? `${p.stock} in stock` : "Sold Out"}
                    </P>
                  </View>
                </View>
              </Pressable>
            ))
          : services.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => handleServicePress(s)}
                className="flex-row mb-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 items-center active:bg-zinc-100"
              >
                <View className="w-12 h-12 bg-white rounded-full items-center justify-center border border-zinc-100">
                  <Clock size={20} color="black" />
                </View>
                <View className="flex-1 ml-4">
                  <P className="font-bold text-base">{s.name}</P>
                  <P className="text-zinc-500 text-xs mt-1">
                    {s.duration} minutes • {formatCurrency(s.price)}
                  </P>
                </View>
              </Pressable>
            ))}
      </ScrollView>

      <ServiceDetailsModal
        visible={!!selectedService}
        service={selectedService}
        onClose={() => setSelectedService(null)}
      />
    </SafeAreaView>
  );
}
