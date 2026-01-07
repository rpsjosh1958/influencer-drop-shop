"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, ShoppingCart, User, Package, Bell, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, Category } from "@/types";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@/components/shop/store-provider";
import { useCart } from "@/components/shop/cart-provider";
import { HeaderSearch } from "@/components/shop/header-search";
import { StoreSwitcher } from "@/components/shop/store-switcher";
import { NotificationDropdown } from "@/components/shop/notification-dropdown";
import { OrdersDropdown } from "@/components/shop/orders-dropdown";
import { ProductCard } from "@/components/shop/product-card";
import { ProfileModal } from "@/components/shop/profile-modal";
import { ReviewsListModal } from "@/components/shop/reviews-list-modal"; // Added
import { ComplaintModal } from "@/components/shop/complaint-modal"; // Added
import { useAlert } from "@/context/alert-context";
import { useNotifications } from "@/context/notification-context";

const fontMap: Record<string, string> = {
  Inter: "var(--font-inter)",
  Roboto: "var(--font-roboto)",
  "Playfair Display": "var(--font-playfair)",
  "Courier Prime": "var(--font-courier)",
};

export default function ShopHome() {
  const params = useParams();
  const storeId = params?.storeId as string;
  const searchParams = useSearchParams();
  const { store } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // UI State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false); // Added
  const [isComplaintOpen, setIsComplaintOpen] = useState(false); // Added
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const router = useRouter();
  const { addToCart, cart, setIsCartOpen } = useCart();
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsub();
  }, []);

  const { showAlert } = useAlert();

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

  useEffect(() => {
    if (!storeId) return;

    async function fetchData() {
      try {
        const qProducts = query(
          collection(db, "stores", storeId, "products"),
          orderBy("createdAt", "desc")
        );
        const snapshotProducts = await getDocs(qProducts);
        const itemsProducts = snapshotProducts.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(itemsProducts);

        const qCategories = query(
          collection(db, "stores", storeId, "categories"),
          orderBy("name", "asc")
        );
        const unsubCategories = onSnapshot(qCategories, (snapshot) => {
          const itemsCategories = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Category[];
          setCategories(itemsCategories);
        });

        return () => unsubCategories();
      } catch (error: any) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [storeId]);

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  // Theme Config
  const theme = store?.theme || {};
  const bgColor = theme.backgroundColor || "#ffffff";
  const fontFamily = theme.fontFamily || "Inter";
  const primaryColor = theme.primaryColor || "#000000";
  const cardSize = theme.cardSize || "medium";

  // Dynamic Fonts Loading
  const usedFonts = [
    theme.fontFamily,
    theme.hero?.headlineFont,
    theme.hero?.subheadlineFont,
  ]
    .filter((font): font is string => !!font)
    .filter((font) => !fontMap[font]);

  const uniqueFonts = Array.from(new Set(usedFonts));
  const googleFontsUrl =
    uniqueFonts.length > 0
      ? `https://fonts.googleapis.com/css2?${uniqueFonts
          .map((font) => `family=${font.replace(/ /g, "+")}:wght@400;700;900`)
          .join("&")}&display=swap`
      : null;

  // Grid Logic
  const getGridClass = () => {
    switch (cardSize) {
      case "small":
        return "grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4";
      case "large":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12";
      case "medium":
      default:
        return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8";
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
        input,
        button,
        select,
        textarea {
          font-family: inherit;
        }
      `}</style>

      {/* Sticky Header */}
      <header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between transition-colors duration-300"
        style={{
          backgroundColor: `${bgColor}CC`,
          borderColor: `${primaryColor}10`,
        }}
      >
        <div
          className={`flex items-center gap-2 ${
            isSearchOpen ? "hidden md:flex" : "flex"
          }`}
        >
          <StoreSwitcher />
        </div>
        <div
          className={`flex items-center gap-4 ${
            isSearchOpen ? "w-full md:w-auto justify-end" : ""
          }`}
        >
          <HeaderSearch
            onAddToCart={addToCart}
            onSearchOpen={setIsSearchOpen}
          />

          {user && (
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
                style={{ color: primaryColor }}
              >
                <Bell size={20} />
                <NotificationBadge />
              </button>
              <NotificationDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
              />
            </div>
          )}
          {user && (
            <button
              onClick={() => setIsOrdersOpen(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              style={{ color: primaryColor }}
              title="Your Orders"
            >
              <Package size={20} />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => {
                if (!user) {
                  router.push(`/shop/${storeId}/login`);
                } else {
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
              className="p-2 hover:bg-black/5 rounded-full transition-colors flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <User size={20} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 py-1"
                >
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-50 flex items-center gap-2 text-black"
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-red-50 text-red-500 flex items-center gap-2"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
            style={{ color: primaryColor }}
          >
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <ShopHero theme={theme} />

      {/* Category Filter */}
      {categories.length > 0 && (
        <section
          className="px-6 mb-8 max-w-7xl mx-auto sticky top-20 z-30 py-4 backdrop-blur-sm -mx-6 md:mx-auto overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: `${bgColor}F2` }}
        >
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2 md:pb-0 px-6 md:px-0 md:justify-center">
            <button
              onClick={() => setSelectedCategory("All")}
              className="whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold border transition-all duration-200"
              style={{
                backgroundColor:
                  selectedCategory === "All" ? primaryColor : "transparent",
                color: selectedCategory === "All" ? bgColor : primaryColor,
                borderColor: primaryColor,
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className="whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold border transition-all duration-200"
                style={{
                  backgroundColor:
                    selectedCategory === cat.name
                      ? primaryColor
                      : "transparent",
                  color: selectedCategory === cat.name ? bgColor : primaryColor,
                  borderColor: primaryColor,
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Product Feed */}
      <section className="px-4 mt-5 md:px-8 max-w-7xl mx-auto">
        {loading ? (
          <div className={`grid ${getGridClass()}`}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-black/5 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className={`grid ${getGridClass()}`}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  addToCart={addToCart}
                  initialOpen={searchParams.get("productId") === product.id}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center opacity-50">
                <p>No products found in this category.</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Footer */}
      <ShopFooter
        theme={theme}
        store={store}
        onOpenReviews={() => setIsReviewsOpen(true)}
        onOpenComplaint={() => setIsComplaintOpen(true)}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
      />
      <OrdersDropdown
        isOpen={isOrdersOpen}
        onClose={() => setIsOrdersOpen(false)}
        user={user}
      />
      <ReviewsListModal
        isOpen={isReviewsOpen}
        onClose={() => setIsReviewsOpen(false)}
        storeId={storeId}
      />
      <ComplaintModal
        isOpen={isComplaintOpen}
        onClose={() => setIsComplaintOpen(false)}
        storeId={storeId}
        user={user}
      />
    </div>
  );
}

function ShopHero({ theme }: { theme: any }) {
  if (!theme?.hero?.enabled) return <div className="pt-24" />;

  const hero = theme.hero || {};
  const {
    headline = "SECURE THE BAG.",
    subheadline = "Limited edition drops.",
    layout = "center",
    headlineColor = "#000000",
    backgroundImages = [],
    overlayOpacity = 0,
    headlineFont = "Inter",
    subheadlineFont = "Inter",
  } = hero;

  const alignClass =
    layout === "left"
      ? "text-left items-start"
      : layout === "right"
      ? "text-right items-end"
      : "text-center items-center";

  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    if (backgroundImages.length > 1) {
      const interval = setInterval(() => {
        setBgIndex((prev) => (prev + 1) % backgroundImages.length);
      }, 5000); // 5s slide
      return () => clearInterval(interval);
    }
  }, [backgroundImages]);

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden min-h-[60vh] flex flex-col justify-center">
      {/* Background Layer */}
      {backgroundImages.length > 0 && (
        <div className="absolute inset-0 z-0">
          <AnimatePresence mode="popLayout">
            <motion.div
              key={bgIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0 w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundImages[bgIndex]}
                alt="Hero"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </AnimatePresence>
          {/* Overlay */}
          <div
            className="absolute inset-0 z-10 bg-black"
            style={{ opacity: overlayOpacity }}
          />
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "circOut" }}
        className={`relative z-20 max-w-5xl mx-auto w-full flex flex-col ${alignClass}`}
      >
        <h1
          className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 uppercase"
          style={{
            color: headlineColor,
            fontFamily:
              fontMap[headlineFont] || `'${headlineFont}', sans-serif`,
          }}
        >
          {headline}
        </h1>

        {subheadline && (
          <p
            className="text-xl md:text-2xl font-medium max-w-2xl leading-relaxed opacity-80"
            style={{
              color: headlineColor,
              fontFamily:
                fontMap[subheadlineFont] || `'${subheadlineFont}', sans-serif`,
            }}
          >
            {subheadline}
          </p>
        )}
      </motion.div>
    </section>
  );
}

function ShopFooter({
  theme,
  store,
  onOpenReviews,
  onOpenComplaint,
}: {
  theme: any;
  store?: any;
  onOpenReviews: () => void;
  onOpenComplaint: () => void;
}) {
  if (!theme?.footer?.enabled) return null;

  const footer = theme.footer || {};
  const { text, socials = {}, contact = {} } = footer;
  const primaryColor = theme.primaryColor || "#000000";

  return (
    <footer
      className="mt-32 border-t border-black/5 py-16 px-6"
      style={{ borderColor: `${primaryColor}20` }}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-sm">
        {/* Brand / Copyright */}
        <div className="space-y-4 text-center md:text-left">
          <div>
            <h3
              className="font-black text-xl tracking-tighter uppercase"
              style={{ color: primaryColor }}
            >
              {store?.name || "DROP."}
            </h3>

            {(store?.rating || 0) > 0 && (
              <button
                onClick={onOpenReviews}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold bg-black/5 px-2.5 py-1.5 rounded-lg hover:bg-black/10 transition-colors"
                style={{ color: primaryColor }}
              >
                <Star size={12} className="fill-current" />
                <span>{Number(store.rating).toFixed(1)}</span>
                <span className="opacity-50">
                  ({store.reviewCount} reviews)
                </span>
              </button>
            )}
          </div>

          <p className="opacity-60">{text || "© 2025 All rights reserved."}</p>
          <div className="pt-4 space-y-2">
            <div>
              <a
                href="/?stay=true"
                className="text-xs font-bold opacity-30 hover:opacity-100 transition-opacity uppercase tracking-widest border-b border-transparent hover:border-current pb-0.5"
              >
                Powered by The Drop
              </a>
            </div>
            <div>
              <button
                onClick={onOpenComplaint}
                className="text-xs font-bold opacity-30 hover:text-red-500 hover:opacity-100 transition-all uppercase tracking-widest"
              >
                File a Complaint
              </button>
            </div>
          </div>
        </div>

        {/* Socials */}
        <div className="space-y-4 text-center">
          <h4 className="font-bold opacity-40 uppercase tracking-widest text-xs">
            Follow Us
          </h4>
          <div className="flex flex-col gap-2 opacity-80 decoration-slice">
            {socials.instagram && <span>IG: {socials.instagram}</span>}
            {socials.twitter && <span>TW: {socials.twitter}</span>}
            {socials.tiktok && <span>TT: {socials.tiktok}</span>}
            {!socials.instagram && !socials.twitter && !socials.tiktok && (
              <span className="opacity-50 italic">No socials linked</span>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="space-y-4 text-center md:text-right">
          <h4 className="font-bold opacity-40 uppercase tracking-widest text-xs">
            Contact & Location
          </h4>
          <div className="flex flex-col gap-2 opacity-80">
            {contact.email && (
              <span className="underline decoration-1">{contact.email}</span>
            )}
            {contact.address && <span>{contact.address}</span>}
            {!contact.email && !contact.address && (
              <span className="opacity-50 italic">No contact info</span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

function NotificationBadge() {
  try {
    const { unreadCount } = useNotifications();
    if (unreadCount === 0) return null;
    return (
      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
    );
  } catch (e) {
    return null;
  }
}
