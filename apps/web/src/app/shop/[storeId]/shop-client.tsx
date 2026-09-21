"use client";

import { useEffect, useState, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { Product, Category, ServiceItem } from "@/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/components/shop/store-provider";
import { useCart } from "@/components/shop/cart-provider";
import { useAlert } from "@/context/alert-context";

// New Refactored Components
import { ShopHeader } from "@/components/shop/shop-header";
import { ShopHero } from "@/components/shop/shop-hero";
import { ShopFooter } from "@/components/shop/shop-footer";
import { CategoryBar } from "@/components/shop/category-bar";
import { FilterBar } from "@/components/shop/filter-bar";
import { ProductFeed } from "@/components/shop/product-feed";

// Modals
import { ProfileModal } from "@/components/shop/profile-modal";
import { ReviewsListModal } from "@/components/shop/reviews-list-modal";
import { ComplaintModal } from "@/components/shop/complaint-modal";
import { OrdersDropdown } from "@/components/shop/orders-dropdown";
import { ProductDetailsModal } from "@/components/shop/product-details-modal";

const fontMap: Record<string, string> = {
  Inter: "var(--font-inter)",
  Roboto: "var(--font-roboto)",
  "Playfair Display": "var(--font-playfair)",
  "Courier Prime": "var(--font-courier)",
};

interface ShopClientProps {
  storeId: string;
  initialProducts: Product[];
  initialServices: ServiceItem[];
  initialCategories: Category[];
}

export default function ShopClient({
  storeId,
  initialProducts,
  initialServices,
  initialCategories,
}: ShopClientProps) {
  const searchParams = useSearchParams();
  const { store } = useStore();
  const router = useRouter();
  const { addToCart, cart, setIsCartOpen } = useCart();
  const { showAlert } = useAlert();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [categories] = useState<Category[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Last-known data for every product ever seen this session, keyed by id —
  // unlike `products` (which drops an item the instant its doc disappears),
  // this is never pruned, so the detail modal below can still render a
  // product a buyer already had open even after a vendor deletes it.
  const [productsById, setProductsById] = useState<Record<string, Product>>(
    () => Object.fromEntries(initialProducts.map((p) => [p.id, p])),
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const selectedProduct = selectedProductId
    ? productsById[selectedProductId] ?? null
    : null;

  // Deep-link support (e.g. shared/notification links with ?productId=...)
  // — previously handled per-card via an `initialOpen` prop, now centralized
  // since the modal itself is no longer owned by any one card.
  useEffect(() => {
    const pid = searchParams.get("productId");
    if (pid) setSelectedProductId(pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter State
  const [filterType, setFilterType] = useState<"all" | "product" | "service">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });

  // UI State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);
  const [isComplaintOpen, setIsComplaintOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsub();
  }, []);

  // Live-sync products/services after the initial server-rendered fetch, so
  // a vendor price/stock change while a buyer is already browsing shows up
  // without a reload — mirrors the store-status onSnapshot in
  // shop-layout-wrapper.tsx, which is why "Drop Closed" already updates live
  // while the items underneath it used to stay frozen.
  useEffect(() => {
    const normalize = (docs: { id: string; data: () => Record<string, unknown> }[]) =>
      docs.map((d) => {
        const data = d.data() as Record<string, any>;
        return {
          ...data,
          id: d.id,
          createdAt:
            data.createdAt?.toMillis?.() ||
            data.createdAt?.seconds * 1000 ||
            Date.now(),
          ...(data.updatedAt && {
            updatedAt:
              data.updatedAt?.toMillis?.() ||
              data.updatedAt?.seconds * 1000 ||
              Date.now(),
          }),
        };
      });

    const unsubProducts = onSnapshot(
      query(
        collection(db, "stores", storeId, "products"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const live = normalize(snap.docs) as Product[];
        setProducts(live);

        setProductsById((prev) => {
          const next = { ...prev };
          for (const p of live) next[p.id] = p;

          // Anything previously known but missing from this snapshot was
          // deleted — keep its last known data (a modal might still be
          // showing it) but flag it so the UI can react gracefully instead
          // of the product just disappearing mid-view.
          const liveIds = new Set(live.map((p) => p.id));
          for (const id of Object.keys(next)) {
            const isLive = liveIds.has(id);
            if (!isLive && !next[id]._removed) {
              next[id] = { ...next[id], _removed: true };
            } else if (isLive && next[id]._removed) {
              next[id] = { ...next[id], _removed: false };
            }
          }
          return next;
        });
      },
      (error) =>
        console.error("ShopClient: live products listener error", error)
    );

    const unsubServices = onSnapshot(
      query(
        collection(db, "stores", storeId, "services"),
        orderBy("createdAt", "desc")
      ),
      (snap) =>
        setServices(
          normalize(snap.docs).filter((s) => s.isActive) as ServiceItem[]
        ),
      (error) =>
        console.error("ShopClient: live services listener error", error)
    );

    return () => {
      unsubProducts();
      unsubServices();
    };
  }, [storeId]);

  const handleLogout = () => {
    showAlert({
      title: "Sign Out",
      message: "Are you sure you want to sign out?",
      confirmLabel: "Sign Out",
      type: "error",
      onConfirm: async () => {
        await signOut(auth);
        window.location.reload();
      },
    });
  };

  // Merged & Filtered Items - Optimized with useMemo
  const filteredItems = useMemo(() => {
    return [
      ...products.map((p) => ({ ...p, type: "product" as const })),
      ...services.map((s) => ({ ...s, type: "service" as const })),
    ]
      .filter((item) => {
        if (selectedCategory !== "All" && item.type === "product") {
          if ((item as Product).category !== selectedCategory) return false;
        }
        if (filterType !== "all" && item.type !== filterType) return false;
        const minPrice = priceRange.min ? parseFloat(priceRange.min) : -Infinity;
        const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        if (item.price < minPrice || item.price > maxPrice) return false;
        return true;
      })
      .sort((a, b) => {
        if (!sortOrder) return 0;
        if (sortOrder === "asc") return a.price - b.price;
        if (sortOrder === "desc") return b.price - a.price;
        return 0;
      });
  }, [products, services, selectedCategory, filterType, priceRange.min, priceRange.max, sortOrder]);

  // Theme Config
  const theme = store?.theme || {};
  const bgColor = theme.backgroundColor || "#ffffff";
  const fontFamily = theme.fontFamily || "Inter";
  const primaryColor = theme.primaryColor || "#000000";
  const cardSize = theme.cardSize || "medium";

  // Dynamic Fonts Loading - Optimized with useMemo
  const googleFontsUrl = useMemo(() => {
    const usedFonts = [theme.fontFamily, theme.hero?.headlineFont, theme.hero?.subheadlineFont]
      .filter((font): font is string => !!font)
      .filter((font) => !fontMap[font]);

    const uniqueFonts = Array.from(new Set(usedFonts));
    if (uniqueFonts.length === 0) return null;

    return `https://fonts.googleapis.com/css2?${uniqueFonts
      .map((font) => `family=${font.replace(/ /g, "+")}:wght@400;700;900`)
      .join("&")}&display=swap`;
  }, [theme.fontFamily, theme.hero?.headlineFont, theme.hero?.subheadlineFont]);

  const getGridClass = () => {
    switch (cardSize) {
      case "small": return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4";
      case "large": return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12";
      case "medium":
      default: return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8";
    }
  };

  return (
    <div
      style={{
        backgroundColor: bgColor,
        fontFamily: fontMap[fontFamily] || `'${fontFamily}', sans-serif`,
        color: primaryColor,
      }}
      className="min-h-screen pb-20 transition-colors duration-500"
    >
      {googleFontsUrl && <link rel="stylesheet" href={googleFontsUrl} />}
      <style jsx global>{`
        input, button, select, textarea { font-family: inherit; }
      `}</style>

      <ShopHeader
        user={user}
        storeId={storeId}
        bgColor={bgColor}
        primaryColor={primaryColor}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        isNotificationsOpen={isNotificationsOpen}
        setIsNotificationsOpen={setIsNotificationsOpen}
        isOrdersOpen={isOrdersOpen}
        setIsOrdersOpen={setIsOrdersOpen}
        isDropdownOpen={isDropdownOpen}
        setIsDropdownOpen={setIsDropdownOpen}
        setIsProfileOpen={setIsProfileOpen}
        setIsCartOpen={setIsCartOpen}
        handleLogout={handleLogout}
        addToCart={addToCart}
        cartCount={cartCount}
        router={router}
        announcement={store?.announcement}
      />

      <ShopHero
        theme={theme}
        hasAnnouncement={!!(store?.announcement?.enabled && store?.announcement?.text)}
      />

      <CategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        bgColor={bgColor}
        primaryColor={primaryColor}
      />

      <FilterBar
        filterType={filterType}
        setFilterType={setFilterType}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        primaryColor={primaryColor}
        showTypeToggle={store?.type === "hybrid"}
      />

      <ProductFeed
        loading={loading}
        filteredItems={filteredItems}
        getGridClass={getGridClass}
        addToCart={addToCart}
        onSelectProduct={setSelectedProductId}
        storeId={storeId}
      />

      <ShopFooter
        theme={theme}
        store={store}
        onOpenReviews={() => setIsReviewsOpen(true)}
        onOpenComplaint={() => setIsComplaintOpen(true)}
      />

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} user={user} />
      <OrdersDropdown isOpen={isOrdersOpen} onClose={() => setIsOrdersOpen(false)} user={user} />
      <ReviewsListModal isOpen={isReviewsOpen} onClose={() => setIsReviewsOpen(false)} storeId={storeId} />
      <ComplaintModal isOpen={isComplaintOpen} onClose={() => setIsComplaintOpen(false)} storeId={storeId} user={user} />
      <ProductDetailsModal
        product={selectedProduct}
        isOpen={!!selectedProductId}
        onClose={() => setSelectedProductId(null)}
      />
    </div>
  );
}
