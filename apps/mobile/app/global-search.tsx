import { useState, useMemo } from "react";
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
  Filter,
  SlidersHorizontal,
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
import { useQuery } from "@tanstack/react-query";

const { width } = Dimensions.get("window");

export default function GlobalSearchScreen() {
  const router = useRouter();
  const [queryText, setQueryText] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Filter State
  const [filterType, setFilterType] = useState<"all" | "product" | "service">(
    "all",
  );
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  const { setStoreId, storeId } = useStore();
  const { addToCart } = useCart();

  // Fetch Global Products & Services once
  const { data: allItems = [], isLoading: loading } = useQuery({
    queryKey: ["global", "trending"],
    queryFn: async () => {
      const qProducts = query(
        collectionGroup(db, "products"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const qServices = query(
        collectionGroup(db, "services"),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const [snapProducts, snapServices] = await Promise.all([
        getDocs(qProducts),
        getDocs(qServices),
      ]);

      const products = snapProducts.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          storeId: data.storeId || doc.ref.parent.parent?.id,
          type: "product" as const,
        };
      }) as (Product & { type: "product" | "service" })[];

      const services = snapServices.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          storeId: data.storeId || doc.ref.parent.parent?.id,
          type: "service" as const,
        };
      }) as (Product & { type: "product" | "service" })[];

      return [...products, ...services];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });

  // Derived Results
  const results = useMemo(() => {
    let filtered = allItems;

    // Search Query Filter
    if (queryText) {
      const lowerQ = queryText.toLowerCase();
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(lowerQ));
    }

    // Type Filter
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }

    // Price Filter
    if (priceRange.min) {
      filtered = filtered.filter((item) => item.price >= parseFloat(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter((item) => item.price <= parseFloat(priceRange.max));
    }

    // Sort
    if (sortOrder) {
      filtered = [...filtered].sort((a, b) => {
        if (sortOrder === "asc") return a.price - b.price;
        return b.price - a.price;
      });
    }

    return filtered;
  }, [allItems, queryText, filterType, priceRange, sortOrder]);

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

      {/* Filter Bar */}
      <View className="px-4 py-2 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          <Pressable
            onPress={() => setShowFilters(!showFilters)}
            className={`flex-row items-center px-3 py-2 rounded-full border ${showFilters ? "bg-black border-black" : "bg-white border-zinc-200"}`}
          >
            <SlidersHorizontal
              size={14}
              color={showFilters ? "white" : "black"}
            />
            <P
              className={`ml-2 text-xs font-bold ${showFilters ? "text-white" : "text-black"}`}
            >
              Filters
            </P>
          </Pressable>

          {/* Type Chips */}
          {(["all", "product", "service"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilterType(t)}
              className={`px-4 py-2 rounded-full border ${filterType === t ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-200"}`}
            >
              <P
                className={`text-xs font-bold uppercase ${filterType === t ? "text-white" : "text-zinc-500"}`}
              >
                {t === "all"
                  ? "All"
                  : t === "product"
                    ? "Products"
                    : "Services"}
              </P>
            </Pressable>
          ))}
        </ScrollView>

        {/* Expanded Filters */}
        {showFilters && (
          <View className="mt-4 p-4 bg-zinc-50 rounded-2xl space-y-4">
            <View>
              <P className="text-xs font-bold text-zinc-500 mb-2 uppercase">
                Price Range
              </P>
              <View className="flex-row items-center gap-3">
                <TextInput
                  placeholder="Min"
                  keyboardType="numeric"
                  value={priceRange.min}
                  onChangeText={(t) =>
                    setPriceRange((prev) => ({ ...prev, min: t }))
                  }
                  className="flex-1 bg-white px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold"
                />
                <P className="text-zinc-400">-</P>
                <TextInput
                  placeholder="Max"
                  keyboardType="numeric"
                  value={priceRange.max}
                  onChangeText={(t) =>
                    setPriceRange((prev) => ({ ...prev, max: t }))
                  }
                  className="flex-1 bg-white px-3 py-2 rounded-xl border border-zinc-200 text-sm font-bold"
                />
              </View>
            </View>

            <View>
              <P className="text-xs font-bold text-zinc-500 mb-2 uppercase">
                Sort By Price
              </P>
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() =>
                    setSortOrder((prev) => (prev === "asc" ? null : "asc"))
                  }
                  className={`flex-1 py-2 rounded-xl border items-center ${sortOrder === "asc" ? "bg-white border-black" : "bg-white border-zinc-200"}`}
                >
                  <P
                    className={`text-xs font-bold ${sortOrder === "asc" ? "text-black" : "text-zinc-500"}`}
                  >
                    Low to High
                  </P>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setSortOrder((prev) => (prev === "desc" ? null : "desc"))
                  }
                  className={`flex-1 py-2 rounded-xl border items-center ${sortOrder === "desc" ? "bg-white border-black" : "bg-white border-zinc-200"}`}
                >
                  <P
                    className={`text-xs font-bold ${sortOrder === "desc" ? "text-black" : "text-zinc-500"}`}
                  >
                    High to Low
                  </P>
                </Pressable>
              </View>
            </View>
          </View>
        )}
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

                {/* Service Tag */}
                {(product as any).type === "service" && (
                  <View className="absolute top-2 left-2 bg-zinc-100 px-2 py-1 rounded-md">
                    <P className="text-[8px] font-black tracking-widest text-zinc-500 uppercase">
                      SERVICE
                    </P>
                  </View>
                )}

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
