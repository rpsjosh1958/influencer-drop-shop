"use client";

import { useEffect, useState, useMemo } from "react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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

  const [products] = useState<Product[]>(initialProducts);
  const [services] = useState<ServiceItem[]>(initialServices);
  const [categories] = useState<Category[]>(initialCategories);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading] = useState(false);
  const [user, setUser] = useState<any>(null);

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
      />

      <ShopHero theme={theme} />

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
      />

      <ProductFeed
        loading={loading}
        filteredItems={filteredItems}
        getGridClass={getGridClass}
        addToCart={addToCart}
        searchParams={searchParams}
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
    </div>
  );
}
