import { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Dimensions,
  RefreshControl,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import {
  collection,
  query,
  orderBy,
  getDocs,
  where,
  doc,
  onSnapshot,
  collectionGroup,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product, ProductCard } from "@/components/shop/product-card";
import { ProductDetailsModal } from "@/components/shop/product-details-modal";
import { FloatingCart } from "@/components/shop/floating-cart";
import { SwipeableNotificationRow } from "@/components/swipeable-notification-row";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/context/cart-context";
import { MotiView, MotiImage, AnimatePresence } from "moti";
import { ShopClosed } from "@/components/shop/shop-closed";
import {
  Bell,
  ShoppingCart,
  Zap,
  X,
  Search,
  ChevronRight,
  Store as StoreIcon,
  Globe,
  Filter,
  SlidersHorizontal,
} from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
  runOnJS,
  withTiming,
  Easing,
  useAnimatedReaction,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { TextInput, TouchableWithoutFeedback, Keyboard } from "react-native";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");

import { useNotifications } from "@/context/notification-context";
import { useRouter } from "expo-router";
import { cn } from "@/lib/utils";

import { useStore } from "@/context/store-context";
import { StoreSwitcher } from "@/components/shop/store-switcher"; // Imported
import { ReviewsListModal } from "@/components/shop/reviews-list-modal"; // Added
import { ComplaintModal } from "@/components/shop/complaint-modal"; // Added
import { ServiceCard, ServiceItem } from "@/components/shop/service-card";
import { BookingModal } from "@/components/shop/booking-modal";
import { Star } from "lucide-react-native"; // Added

export default function ShopHome() {
  const router = useRouter();
  const { storeId, store, setStoreId } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false); // Added
  const [isComplaintOpen, setIsComplaintOpen] = useState(false); // Added

  // Filter State
  const [filterType, setFilterType] = useState<"all" | "product" | "service">(
    "all",
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });

  // Hero Slideshow
  const [currentHeroImageIndex, setCurrentHeroImageIndex] = useState(0);

  // Use store status instead of system config
  const isLive = store?.status === "live";

  useEffect(() => {
    if (store?.theme) {
      console.log(
        "🎨 MOBILE THEME DEBUG:",
        JSON.stringify(store.theme, null, 2),
      );
    }
  }, [store?.theme]);

  // Slideshow Effect
  useEffect(() => {
    const images = store?.theme?.hero?.backgroundImages;
    if (!images || images.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentHeroImageIndex((prev) => (prev + 1) % images.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [store?.theme?.hero?.backgroundImages]);

  // Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // const [searchScope, setSearchScope] = useState<"store" | "global">("store"); // Replaced by params

  // Notification State
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "read">(
    "all",
  );

  const { notifications, unreadCount, markAsRead } = useNotifications();

  // Filter Logic
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "unread") return !n.read;
    if (notifFilter === "read") return n.read;
    return true;
  });

  const { addToCart, cart } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Animation Values
  const translateX = useSharedValue(0);
  const contextX = useSharedValue(0);

  // Effect to sync state changes
  useEffect(() => {
    const target = isNotificationOpen ? -width : 0;
    translateX.value = withTiming(target, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [isNotificationOpen]);

  // Gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onStart(() => {
      contextX.value = translateX.value;
    })
    .onUpdate((e) => {
      let newValue = contextX.value + e.translationX;
      if (newValue > 0) newValue = 0;
      if (newValue < -width) newValue = -width;
      translateX.value = newValue;
    })
    .onEnd((e) => {
      if (translateX.value < -width / 2 || e.velocityX < -500) {
        translateX.value = withTiming(
          -width,
          { duration: 300, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(setIsNotificationOpen)(true);
          },
        );
      } else {
        translateX.value = withTiming(
          0,
          { duration: 300, easing: Easing.out(Easing.quad) },
          (finished) => {
            if (finished) runOnJS(setIsNotificationOpen)(false);
          },
        );
      }
    });

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const fetchProducts = async () => {
    if (!storeId) return;
    try {
      const q = query(
        collection(db, "stores", storeId, "products"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[];
      setProducts(items);
    } catch (error) {
      console.log("Error fetching products:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    if (!storeId) return;

    // Fetch Categories (Store Scoped)
    const unsubCategories = onSnapshot(
      query(
        collection(db, "stores", storeId, "categories"),
        orderBy("name", "asc"),
      ),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(items);
      },
      (error) => console.log("Error fetching categories:", error),
    );

    // Fetch Services (for service/hybrid stores)
    const fetchServices = async () => {
      try {
        const qServices = query(
          collection(db, "stores", storeId, "services"),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(qServices);
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceItem[];
        setServices(items.filter((s) => s.isActive));
      } catch (error) {
        console.log("Error fetching services:", error);
      }
    };
    fetchServices();

    return () => {
      unsubCategories();
    };
  }, [storeId]);

  // Search Logic
  const searchWidth = useSharedValue(0);
  const searchOpacity = useSharedValue(0);

  useEffect(() => {
    if (isSearchOpen) {
      searchWidth.value = withTiming(width - 48, { duration: 300 });
      searchOpacity.value = withTiming(1, { duration: 300 });
    } else {
      searchWidth.value = withTiming(0, { duration: 300 });
      searchOpacity.value = withTiming(0, { duration: 200 });
      Keyboard.dismiss();
      setSearchQuery("");
      setSuggestions([]);
      if (searchResults.length > 0) {
        setSearchResults([]);
        setIsSearching(false);
      }
    }
  }, [isSearchOpen]);

  const searchStyle = useAnimatedStyle(() => {
    return {
      width: searchWidth.value,
      opacity: searchOpacity.value,
    };
  });

  const handleSearchTextChange = (text: string) => {
    setSearchQuery(text);
    if (text.length > 1) {
      // Client-side suggestions
      const textLower = text.toLowerCase();
      const matched = products.filter((p) =>
        p.name.toLowerCase().includes(textLower),
      );
      setSuggestions(matched.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  // Category State
  interface Category {
    id: string;
    name: string;
    slug: string;
  }
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const performSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!storeId) return;

    setIsSearching(true);
    setLoading(true);
    setSuggestions([]);
    Keyboard.dismiss();

    try {
      // Store Search - storeId is guaranteed to be string here
      const q = query(
        collection(db, "stores", storeId, "products"),
        where("name", ">=", searchQuery),
        where("name", "<=", searchQuery + "\uf8ff"),
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const results = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            storeId: data.storeId || doc.ref.parent.parent?.id,
          };
        }) as Product[];

        setSearchResults(results);
      } else {
        // Fallback for case-insensitive local filtering (Store Scope)
        const textLower = searchQuery.toLowerCase();
        const localResults = products.filter((p) =>
          p.name.toLowerCase().includes(textLower),
        );
        setSearchResults(localResults);
      }
    } catch (e) {
      console.error("Search failed:", e);
      // Fallback
      const textLower = searchQuery.toLowerCase();
      const localResults = products.filter((p) =>
        p.name.toLowerCase().includes(textLower),
      );
      setSearchResults(localResults);
    } finally {
      setLoading(false);
    }
  };

  const displayedProducts = isSearching
    ? searchResults
    : selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // Filter Logic
  const isFilteredView =
    filterType !== "all" || !!sortOrder || !!priceRange.min || !!priceRange.max;

  const filteredItems = isFilteredView
    ? [
        ...products.map((p) => ({ ...p, type: "product" as const })),
        ...services.map((s) => ({ ...s, type: "service" as const })),
      ]
        .filter((item) => {
          // 1. Category (If selected and item is product - similar to web logic)
          if (
            selectedCategory !== "All" &&
            item.type === "product" &&
            (item as Product).category !== selectedCategory
          )
            return false;

          // 2. Type
          if (filterType !== "all" && item.type !== filterType) return false;

          // 3. Price
          if (priceRange.min && item.price < parseFloat(priceRange.min))
            return false;
          if (priceRange.max && item.price > parseFloat(priceRange.max))
            return false;

          return true;
        })
        .sort((a, b) => {
          if (sortOrder === "asc") return a.price - b.price;
          if (sortOrder === "desc") return b.price - a.price;
          return 0; // Default handling order: Mixed
        })
    : [];

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [storeId]);

  if (loading && !products.length) {
    return (
      <GestureHandlerRootView className="flex-1 bg-black">
        <StatusBar style="dark" />
        <SafeAreaView className="flex-1 bg-white">
          <View className="px-6 py-4">
            <View className="h-4 w-20 bg-zinc-100 rounded-full mb-4" />
            {/* Logo skeleton */}
            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-row items-center gap-2 bg-zinc-100 rounded-full px-3 py-1.5 w-32 h-6" />
            </View>
            <View className="mb-4 items-center space-y-2">
              <Skeleton width="80%" height={40} radius={8} />
              <Skeleton width="60%" height={20} radius={4} />
            </View>
            <View className="flex-row flex-wrap justify-center align-center">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="w-[48%] mb-6 space-y-3">
                  <Skeleton width="100%" height={256} radius={20} />
                  <Skeleton width="60%" height={24} radius={4} />
                  <Skeleton width="40%" height={16} radius={4} />
                </View>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  if (isLive === false) {
    return <ShopClosed />;
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style={isNotificationOpen ? "light" : "dark"} />

      <GestureDetector gesture={panGesture}>
        <View className="flex-1 bg-black">
          {/* Notification Screen (Behind) */}
          <View className="absolute inset-0 bg-black z-0">
            {/* ... NO CHANGE ... */}
            <SafeAreaView className="flex-1 px-6">
              <View className="flex-row items-center justify-between py-4 border-b border-zinc-800 mb-4">
                <H1 className="text-white text-3xl font-black tracking-tighter">
                  NOTIFICATIONS
                </H1>
                <Pressable
                  onPress={() => setIsNotificationOpen(false)}
                  className="bg-zinc-800 p-2 rounded-full"
                >
                  <X color="white" size={24} />
                </Pressable>
              </View>

              <View className="flex-row gap-2 mb-6">
                {["all", "unread", "read"].map((f) => (
                  <Pressable
                    key={f}
                    onPress={() => setNotifFilter(f as any)}
                    className={`px-4 py-2 rounded-full border ${
                      notifFilter === f
                        ? "bg-white border-white"
                        : "bg-transparent border-zinc-700"
                    }`}
                  >
                    <P
                      className={`text-xs font-bold uppercase ${
                        notifFilter === f ? "text-black" : "text-zinc-500"
                      }`}
                    >
                      {f}
                    </P>
                  </Pressable>
                ))}
              </View>

              <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
              >
                <View className="space-y-4 gap-4">
                  {filteredNotifications.map((item, index) => (
                    <SwipeableNotificationRow
                      key={item.id}
                      onDismiss={() => markAsRead(item.id)}
                      hint={index === 0 && isNotificationOpen}
                    >
                      <Pressable
                        onPress={() => {
                          if (!item.read) markAsRead(item.id);
                          setIsNotificationOpen(false); // Close drawer
                          // if (item.type === "order_update") {
                          //   router.push({
                          //     pathname: "/(tabs)/orders",
                          //     params: { orderId: item.orderId },
                          //   });
                          // }
                        }}
                        className={`bg-zinc-900 p-5 rounded-3xl border ${
                          item.read ? "border-zinc-800" : ""
                        } flex-row gap-4 w-full`}
                      >
                        <View className="h-12 w-12 bg-zinc-800 rounded-full items-center justify-center">
                          {item.type === "drop" || item.type === "broadcast" ? (
                            <Zap size={20} color="#fbbf24" fill="#fbbf24" />
                          ) : (
                            <ShoppingCart size={20} color="white" />
                          )}
                        </View>
                        <View className="flex-1">
                          <View className="flex-row justify-between items-start">
                            <P className="text-white font-bold text-lg">
                              {item.title}
                            </P>
                            <P className="text-zinc-500 text-xs">
                              {item.createdAt?.seconds
                                ? new Date(
                                    item.createdAt.seconds * 1000,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Now"}
                            </P>
                          </View>
                          <P className="text-zinc-400 mt-1 leading-relaxed">
                            {item.message}
                          </P>
                        </View>
                        {!item.read && (
                          <View className="h-2 w-2 rounded-full bg-cyan-400 absolute top-3 left-3" />
                        )}
                      </Pressable>
                    </SwipeableNotificationRow>
                  ))}
                  {filteredNotifications.length === 0 && (
                    <P className="text-zinc-500 text-center mt-10">
                      No notifications found
                    </P>
                  )}
                </View>
              </ScrollView>

              <View className="py-4 justify-end opacity-50">
                <P className="text-zinc-500 text-center text-xs uppercase tracking-widest">
                  Swipe right to close • Swipe items to read
                </P>
              </View>
            </SafeAreaView>
          </View>

          {/* Main Screen Content (Draggable) */}
          <Animated.View
            style={[
              rStyle,
              { backgroundColor: store?.theme?.backgroundColor || "#ffffff" },
            ]}
            className="flex-1 overflow-hidden shadow-2xl z-10"
          >
            <SafeAreaView className="flex-1">
              {/* Header */}
              <View className="flex-row items-center justify-between px-6 py-4 z-50">
                {/* Logo Area */}
                {!isSearchOpen && (
                  <MotiView
                    from={{ opacity: 0, translateX: -10 }}
                    animate={{ opacity: 1, translateX: 0 }}
                    exit={{ opacity: 0, translateX: -10 }}
                    transition={{ type: "timing", duration: 250 }}
                    className="flex-1 mr-4"
                  >
                    <StoreSwitcher />
                  </MotiView>
                )}

                <View className="flex-row items-center gap-4">
                  {/* Search Bar */}
                  {isSearchOpen ? (
                    <Animated.View
                      style={[
                        searchStyle,
                        {
                          overflow: "hidden",
                          backgroundColor: "#f4f4f5",
                          borderRadius: 12,
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 12,
                          height: 44,
                        },
                      ]}
                    >
                      {/* Search Scope Toggle */}
                      <View className="flex-row gap-1 mr-2 bg-zinc-200 rounded-lg p-0.5">
                        <Pressable className="p-1 rounded-md bg-white shadow-sm">
                          <StoreIcon size={14} color="black" />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setIsSearchOpen(false);
                            router.push("/global-search");
                          }}
                          className="p-1 rounded-md"
                        >
                          <Globe size={14} color="#a1a1aa" />
                        </Pressable>
                      </View>

                      <TextInput
                        value={searchQuery}
                        onChangeText={handleSearchTextChange}
                        onSubmitEditing={performSearch}
                        returnKeyType="search"
                        placeholder="Search this store..."
                        className="flex-1 ml-1 font-medium text-black h-full"
                        placeholderTextColor="#a1a1aa"
                      />
                      <Pressable onPress={() => setIsSearchOpen(false)}>
                        <X size={18} color="#71717a" />
                      </Pressable>
                    </Animated.View>
                  ) : (
                    <Pressable
                      onPress={() => setIsSearchOpen(true)}
                      className="p-1"
                    >
                      <Search
                        color={store?.theme?.primaryColor || "black"}
                        size={24}
                      />
                    </Pressable>
                  )}

                  {/* Notification Bell */}
                  {!isSearchOpen && (
                    <Pressable
                      onPress={() => setIsNotificationOpen(!isNotificationOpen)}
                    >
                      <Bell
                        color={store?.theme?.primaryColor || "black"}
                        size={24}
                      />
                      {unreadCount > 0 && (
                        <View className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full items-center justify-center border border-white">
                          <P className="text-[8px] text-white font-bold">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </P>
                        </View>
                      )}
                    </Pressable>
                  )}
                </View>
              </View>

              {/* Blur Overlay */}
              {isSearchOpen && suggestions.length > 0 && (
                <BlurView
                  intensity={20}
                  tint="light"
                  className="absolute inset-0 z-40"
                  style={{ top: 80 }}
                />
              )}

              {/* Suggestions Dropdown */}
              {isSearchOpen && suggestions.length > 0 && (
                <View className="absolute top-[109px] left-6 right-6 bg-zinc-50 rounded-2xl shadow-xl z-50 border border-zinc-100 overflow-hidden">
                  {suggestions.map((item, index) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        setSearchQuery(item.name);
                        setSuggestions([]);
                        Keyboard.dismiss();
                        setIsSearching(true);
                        setSearchResults([item]);
                      }}
                      className={`p-4 flex-row items-center justify-between ${
                        index !== suggestions.length - 1
                          ? "border-b border-zinc-50"
                          : ""
                      }`}
                    >
                      <View className="flex-row items-center gap-3">
                        <Search size={14} color="#d4d4d8" />
                        <P className="text-zinc-700 font-bold">{item.name}</P>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Scrolling Content */}
              <ScrollView
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="black"
                  />
                }
                scrollEnabled={!isSearchOpen || suggestions.length === 0}
              >
                {!isSearching && store?.theme?.hero?.enabled !== false && (
                  <View className="relative w-full mb-6 overflow-hidden h-40 justify-center">
                    {/* Background Image Logic */}
                    {(store?.theme?.hero?.backgroundImages?.length ?? 0) >
                      0 && (
                      <View className="absolute inset-0 bg-zinc-200">
                        <AnimatePresence>
                          <MotiImage
                            key={currentHeroImageIndex}
                            from={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ type: "timing", duration: 1500 }}
                            source={{
                              uri: store?.theme?.hero?.backgroundImages?.[
                                currentHeroImageIndex
                              ],
                            }}
                            className="absolute inset-0 w-full h-full"
                            style={{
                              resizeMode: "cover",
                              position: "absolute",
                            }}
                          />
                        </AnimatePresence>
                        <View
                          className="absolute inset-0"
                          style={{
                            backgroundColor: `rgba(0,0,0,${
                              store?.theme?.hero?.overlayOpacity ?? 0.2
                            })`,
                          }}
                        />
                      </View>
                    )}

                    <View className="px-6 py-12 relative z-10">
                      <MotiView
                        from={{ opacity: 0, translateY: 30 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 200 }}
                        className={cn(
                          "flex-col",
                          store?.theme?.hero?.layout === "left"
                            ? "items-start"
                            : store?.theme?.hero?.layout === "right"
                              ? "items-end"
                              : "items-center",
                        )}
                      >
                        {!!store?.theme?.hero?.headline && (
                          <H1
                            className={cn(
                              "text-3xl font-black tracking-tighter leading-none mb-4 uppercase",
                              store?.theme?.hero?.layout === "left"
                                ? "text-left"
                                : store?.theme?.hero?.layout === "right"
                                  ? "text-right"
                                  : "text-center",
                            )}
                            style={{
                              color:
                                store?.theme?.hero?.headlineColor || "white",
                            }}
                          >
                            {store.theme.hero.headline}
                          </H1>
                        )}
                        {!!store?.theme?.hero?.subheadline && (
                          <P
                            className={cn(
                              "text-lg",
                              store?.theme?.hero?.layout === "left"
                                ? "text-left"
                                : store?.theme?.hero?.layout === "right"
                                  ? "text-right"
                                  : "text-center",
                            )}
                            style={{
                              color:
                                store?.theme?.hero?.headlineColor || "white",
                            }}
                          >
                            {store.theme.hero.subheadline}
                          </P>
                        )}
                      </MotiView>
                    </View>
                  </View>
                )}

                {/* Category Filter */}
                {!isSearching && categories.length > 0 && (
                  <View className="mb-6">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
                      className="flex-row"
                    >
                      <Pressable
                        onPress={() => setSelectedCategory("All")}
                        className={`px-5 py-2.5 rounded-full border ${
                          selectedCategory === "All"
                            ? "bg-black border-black"
                            : "bg-white border-zinc-200"
                        }`}
                      >
                        <P
                          className={`text-xs font-bold ${
                            selectedCategory === "All"
                              ? "text-white"
                              : "text-black"
                          }`}
                        >
                          All
                        </P>
                      </Pressable>
                      {categories.map((cat) => (
                        <Pressable
                          key={cat.id}
                          onPress={() => setSelectedCategory(cat.name)}
                          className={`px-5 py-2.5 rounded-full border ${
                            selectedCategory === cat.name
                              ? "bg-black border-black"
                              : "bg-white border-zinc-200"
                          }`}
                        >
                          <P
                            className={`text-xs font-bold ${
                              selectedCategory === cat.name
                                ? "text-white"
                                : "text-black"
                            }`}
                          >
                            {cat.name}
                          </P>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Filter Bar */}
                {!isSearching && (
                  <View className="px-6 mb-6">
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      <Pressable
                        onPress={() => setShowFilters(!showFilters)}
                        className={`flex-row items-center px-4 py-2.5 rounded-full border ${showFilters ? "bg-black border-black" : "bg-white border-zinc-200"}`}
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

                      {/* Type Chips - Only show for hybrid stores */}
                      {store?.type === "hybrid" &&
                        (["all", "product", "service"] as const).map((t) => (
                          <Pressable
                            key={t}
                            onPress={() => setFilterType(t)}
                            className={`px-4 py-2.5 rounded-full border ${filterType === t ? "bg-zinc-900 border-zinc-900" : "bg-white border-zinc-200"}`}
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
                              className="flex-1 bg-white px-3 py-2.5 rounded-xl border border-zinc-200 text-sm font-bold"
                            />
                            <P className="text-zinc-400">-</P>
                            <TextInput
                              placeholder="Max"
                              keyboardType="numeric"
                              value={priceRange.max}
                              onChangeText={(t) =>
                                setPriceRange((prev) => ({ ...prev, max: t }))
                              }
                              className="flex-1 bg-white px-3 py-2.5 rounded-xl border border-zinc-200 text-sm font-bold"
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
                                setSortOrder((prev) =>
                                  prev === "asc" ? null : "asc",
                                )
                              }
                              className={`flex-1 py-2.5 rounded-xl border items-center ${sortOrder === "asc" ? "bg-white border-black" : "bg-white border-zinc-200"}`}
                            >
                              <P
                                className={`text-xs font-bold ${sortOrder === "asc" ? "text-black" : "text-zinc-500"}`}
                              >
                                Low to High
                              </P>
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                setSortOrder((prev) =>
                                  prev === "desc" ? null : "desc",
                                )
                              }
                              className={`flex-1 py-2.5 rounded-xl border items-center ${sortOrder === "desc" ? "bg-white border-black" : "bg-white border-zinc-200"}`}
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
                )}

                {isSearching && (
                  <View className="px-6 py-4">
                    <H1 className="text-2xl font-black uppercase mb-4">
                      {searchResults.length} Results
                    </H1>
                  </View>
                )}

                <View className="px-4">
                  {loading ? (
                    <View className="flex-row flex-wrap justify-center align-center">
                      {[1, 2, 3, 4].map((i) => (
                        <View key={i} className="w-[48%] mb-6 space-y-3">
                          <Skeleton width="100%" height={256} radius={20} />
                          <Skeleton width="60%" height={24} radius={4} />
                          <Skeleton width="40%" height={16} radius={4} />
                        </View>
                      ))}
                    </View>
                  ) : isFilteredView ? (
                    // FILTERED VIEW (Unified Grid)
                    <View className="mb-8 px-4">
                      <H1 className="text-lg font-bold mb-4 px-2">
                        Filtered Results
                      </H1>
                      <View
                        className={cn(
                          "flex-row flex-wrap gap-3",
                          store?.theme?.cardSize === "large"
                            ? "justify-center"
                            : "justify-between",
                        )}
                      >
                        {filteredItems.length > 0 ? (
                          filteredItems.map((item, i) => (
                            <View
                              key={item.id}
                              style={{
                                width:
                                  store?.theme?.cardSize === "large"
                                    ? "100%"
                                    : store?.theme?.cardSize === "small"
                                      ? "31%"
                                      : "48%",
                              }}
                              className="mb-4"
                            >
                              {item.type === "service" ? (
                                <ServiceCard
                                  service={item as ServiceItem}
                                  index={i}
                                  onPress={(s) => setSelectedService(s)}
                                />
                              ) : (
                                <ProductCard
                                  product={item as Product}
                                  index={i}
                                  onPress={async (p) => {
                                    // Simplified nav for store home (we are already here, just open modal)
                                    setSelectedProduct(p);
                                  }}
                                />
                              )}
                            </View>
                          ))
                        ) : (
                          <View className="w-full py-20 items-center">
                            <P className="text-zinc-400">
                              No items match your filters.
                            </P>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    // DEFAULT VIEW (Unified Grid like Web)
                    <>
                      <View className="px-4">
                        <View
                          className={cn(
                            "flex-row flex-wrap gap-3",
                            store?.theme?.cardSize === "large"
                              ? "justify-center"
                              : "justify-between",
                          )}
                        >
                          {/* Products First */}
                          {displayedProducts.map((product, i) => (
                            <View
                              key={product.id}
                              style={{
                                width:
                                  store?.theme?.cardSize === "large"
                                    ? "100%"
                                    : store?.theme?.cardSize === "small"
                                      ? "31%"
                                      : "48%",
                              }}
                              className="mb-4"
                            >
                              <ProductCard
                                product={product}
                                index={i}
                                onPress={async (p) => {
                                  if (p.storeId && p.storeId !== storeId) {
                                    await setStoreId(p.storeId);
                                    setTimeout(
                                      () => setSelectedProduct(p),
                                      100,
                                    );
                                  } else {
                                    setSelectedProduct(p);
                                  }
                                }}
                              />
                            </View>
                          ))}

                          {/* Services After Products */}
                          {services.map((service, i) => (
                            <View
                              key={service.id}
                              style={{
                                width:
                                  store?.theme?.cardSize === "large"
                                    ? "100%"
                                    : store?.theme?.cardSize === "small"
                                      ? "31%"
                                      : "48%",
                              }}
                              className="mb-4"
                            >
                              <ServiceCard
                                service={service}
                                index={displayedProducts.length + i}
                                onPress={(s) => setSelectedService(s)}
                              />
                            </View>
                          ))}

                          {isSearching && searchResults.length === 0 && (
                            <View className="w-full py-10 items-center">
                              <P className="text-zinc-400">
                                No drops found matching "{searchQuery}"
                              </P>
                            </View>
                          )}
                          {!isSearching &&
                            displayedProducts.length === 0 &&
                            services.length === 0 && (
                              <View className="w-full py-20 items-center">
                                <P className="text-zinc-400">
                                  No products or services available.
                                </P>
                              </View>
                            )}
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Footer Section */}
                {store?.theme?.footer?.enabled && (
                  <View
                    className="px-6 py-10 border-t border-zinc-100 mt-10"
                    style={{ borderColor: `${store.theme.primaryColor}20` }}
                  >
                    <View className="items-center space-y-4">
                      <H1
                        className="text-xl font-black uppercase tracking-tighter"
                        style={{ color: store.theme.primaryColor || "black" }}
                      >
                        {store.name}
                      </H1>

                      {/* Rating Badge */}
                      {(store.rating || 0) > 0 && (
                        <Pressable
                          onPress={() => setIsReviewsOpen(true)}
                          className="flex-row items-center gap-1.5 bg-zinc-100 px-3 py-1.5 rounded-full mt-2 active:opacity-70"
                        >
                          {/* Use Star from lucide-react-native already imported or add import if needed */}
                          <View style={{ marginRight: 2 }}>
                            <Star size={12} color="black" fill="black" />
                          </View>
                          <P className="text-xs font-bold">
                            {Number(store.rating).toFixed(1)}
                          </P>
                          <P className="text-xs text-zinc-500">
                            ({store.reviewCount} reviews)
                          </P>
                        </Pressable>
                      )}

                      {store.theme.footer.text && (
                        <P
                          className="text-center text-xs opacity-60"
                          style={{ color: store.theme.primaryColor || "black" }}
                        >
                          {store.theme.footer.text}
                        </P>
                      )}

                      {/* Socials & Contact */}
                      <View className="flex-row gap-6 mt-4 opacity-80">
                        {store.theme.footer.socials?.instagram && (
                          <P className="text-xs font-bold">
                            IG: {store.theme.footer.socials.instagram}
                          </P>
                        )}
                        {store.theme.footer.socials?.twitter && (
                          <P className="text-xs font-bold">
                            TW: {store.theme.footer.socials.twitter}
                          </P>
                        )}
                      </View>

                      <View className="items-center gap-1 mt-2 mb-4 opacity-60">
                        {store.theme.footer.contact?.email && (
                          <P className="text-xs underline">
                            {store.theme.footer.contact.email}
                          </P>
                        )}
                        {store.theme.footer.contact?.address && (
                          <P className="text-xs text-center">
                            {store.theme.footer.contact.address}
                          </P>
                        )}
                      </View>

                      <Pressable
                        onPress={() => setIsComplaintOpen(true)}
                        className="py-2"
                      >
                        <P className="text-[10px] font-bold text-red-500 uppercase tracking-widest opacity-80">
                          File a Complaint
                        </P>
                      </Pressable>

                      <P className="text-[10px] text-zinc-300 uppercase tracking-widest mt-1">
                        Powered by The Drop Shop
                      </P>
                    </View>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </Animated.View>
        </View>
      </GestureDetector>

      <FloatingCart />

      <ProductDetailsModal
        isVisible={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        onAddToCart={(p, v) => {
          addToCart({
            id: p.id,
            name: p.name,
            price: v?.price || p.price,
            image: p.images && p.images[0] ? p.images[0] : p.imageUrl || "",
            variant: v,
          });
        }}
      />

      <ReviewsListModal
        visible={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        storeId={storeId!}
        storeStats={{
          rating: store?.rating || 0,
          count: store?.reviewCount || 0,
          distribution: store?.ratingDistribution || {},
        }}
      />

      <ComplaintModal
        visible={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        storeId={storeId!}
        user={null}
        forcedTarget="store"
      />

      {selectedService && (
        <BookingModal
          service={selectedService}
          isVisible={!!selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}
    </View>
  );
}
