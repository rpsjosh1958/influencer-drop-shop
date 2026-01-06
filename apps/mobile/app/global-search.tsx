import { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  Search,
  X,
  ChevronLeft,
  Store as StoreIcon,
} from "lucide-react-native";
import {
  collectionGroup,
  query,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, ProductCard } from "@/components/shop/product-card";
import { H1, P } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/context/store-context";
import { ProductDetailsModal } from "@/components/shop/product-details-modal";
import { useCart } from "@/context/cart-context";

const { width } = Dimensions.get("window");

export default function GlobalSearchScreen() {
  const router = useRouter();
  const [queryText, setQueryText] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { setStoreId, storeId } = useStore();
  const { addToCart } = useCart();

  // Fetch Global Products
  useEffect(() => {
    async function fetchGlobal() {
      setLoading(true);
      try {
        const q = query(
          collectionGroup(db, "products"),
          orderBy("createdAt", "desc"),
          limit(100)
        );

        const snapshot = await getDocs(q);
        const allProducts = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            storeId: data.storeId || doc.ref.parent.parent?.id,
          };
        }) as Product[];

        if (!queryText) {
          setResults(allProducts);
        } else {
          const lowerQ = queryText.toLowerCase();
          const filtered = allProducts.filter((p) =>
            p.name.toLowerCase().includes(lowerQ)
          );
          setResults(filtered);
        }
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setLoading(false);
      }
    }

    // Debounce slightly or just run
    const timer = setTimeout(() => {
      fetchGlobal();
    }, 300);

    return () => clearTimeout(timer);
  }, [queryText]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="px-4 py-3 border-b border-zinc-100 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          className="p-2 -ml-2 rounded-full active:bg-zinc-100"
        >
          <ChevronLeft size={24} color="black" />
        </Pressable>

        <View className="flex-1 flex-row items-center bg-zinc-100 rounded-xl px-3 h-11">
          <Search size={18} color="#a1a1aa" />
          <TextInput
            className="flex-1 ml-2 font-medium text-black h-full"
            placeholder="Search across all stores..."
            placeholderTextColor="#a1a1aa"
            value={queryText}
            onChangeText={setQueryText}
            autoFocus
            returnKeyType="search"
          />
          {queryText.length > 0 && (
            <Pressable onPress={() => setQueryText("")}>
              <X size={18} color="#71717a" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <H1 className="text-2xl font-black mb-1">
          {queryText ? `Results for "${queryText}"` : "Trending Now"}
        </H1>
        <P className="text-zinc-500 mb-6 text-sm">
          {loading
            ? "Searching..."
            : `Found ${results.length} items from various stores.`}
        </P>

        {loading ? (
          <View className="flex-row flex-wrap justify-between">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="w-[48%] mb-6 space-y-3">
                <Skeleton width="100%" height={200} radius={16} />
                <Skeleton width="60%" height={20} radius={4} />
              </View>
            ))}
          </View>
        ) : results.length > 0 ? (
          <View className="flex-row flex-wrap justify-between">
            {results.map((product, i) => (
              <View key={product.id} className="w-[48%] mb-4">
                <ProductCard
                  product={product}
                  index={i}
                  onPress={async (p) => {
                    // Similar logic to index.tsx for cross-store navigation
                    // But here, since we are in a separate screen, we want to:
                    // 1. Switch context
                    // 2. Open Modal (Rendered here!)

                    if (p.storeId && p.storeId !== storeId) {
                      await setStoreId(p.storeId);
                    }
                    setSelectedProduct(p);
                  }}
                />

                {/* Store Badge for clarity */}
                <Pressable
                  className="flex-row items-center mt-1 opacity-50 active:opacity-100"
                  onPress={() => {
                    if (product.storeId) {
                      setStoreId(product.storeId);
                      router.dismissTo("/");
                    }
                  }}
                >
                  <StoreIcon size={10} color="black" />
                  <P className="text-[10px] ml-1 font-bold uppercase tracking-wide">
                    View Store
                  </P>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View className="py-20 items-center">
            <P className="text-zinc-400">No items found.</P>
          </View>
        )}
      </ScrollView>

      <ProductDetailsModal
        isVisible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onAddToCart={(p, v) => {
          addToCart({
            id: p.id,
            name: p.name,
            price: v?.price || p.price,
            image: p.images?.[0] || p.imageUrl || "",
            variant: v,
          });
        }}
      />
    </SafeAreaView>
  );
}
