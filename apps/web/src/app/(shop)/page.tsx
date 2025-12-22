"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  onSnapshot,
} from "firebase/firestore"; // Added onSnapshot
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LogOut, ShoppingCart, User, Zap, Package, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, Category } from "@/types"; // Added Category
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

import { useCart } from "@/components/shop/cart-provider";
import { ProductCard } from "@/components/shop/product-card";

import { ProfileModal } from "@/components/shop/profile-modal";
import { OrdersDropdown } from "@/components/shop/orders-dropdown";
import { HeaderSearch } from "@/components/shop/header-search";
import { NotificationDropdown } from "@/components/shop/notification-dropdown";
import { useNotifications } from "@/context/notification-context";
import { useAlert } from "@/context/alert-context";

export default function ShopHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); // Added categories state
  const [selectedCategory, setSelectedCategory] = useState("All"); // Added selectedCategory state
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
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
    async function fetchData() {
      try {
        // Fetch Products
        const qProducts = query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        );
        const snapshotProducts = await getDocs(qProducts);
        const itemsProducts = snapshotProducts.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(itemsProducts);

        // Fetch Categories
        const qCategories = query(
          collection(db, "categories"),
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
  }, []);

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-purple-500 selection:text-white pb-20">
      {/* Sticky Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between">
        <div
          className={`flex items-center gap-2 ${
            isSearchOpen ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="h-6 w-6 bg-black rounded-full animate-pulse" />
          <span className="font-black tracking-tighter text-xl">DROP.</span>
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
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-black relative"
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
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-black"
              title="Your Orders"
            >
              <Package size={20} />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => {
                if (!user) {
                  router.push("/login");
                } else {
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500 hover:text-black flex items-center gap-2"
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
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-50 flex items-center gap-2"
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
            className="relative p-2 hover:bg-zinc-100 rounded-full transition-colors"
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
      <section className="pt-32 pb-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black text-white text-xs font-bold uppercase tracking-widest mb-6">
            <Zap size={14} className="text-yellow-400 fill-yellow-400" />
            Live Drop Now Active
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8">
            SECURE THE <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500">
              BAG.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed">
            Limited edition drops. Once they're gone, they're gone forever.
            Don't lack.
          </p>
        </motion.div>
      </section>

      {/* Category Filter */}
      {categories.length > 0 && (
        <section className="px-6 mb-8 max-w-7xl mx-auto sticky top-20 z-30 py-4 bg-white/95 backdrop-blur-sm -mx-6 md:mx-auto overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2 md:pb-0 px-6 md:px-0 md:justify-center">
            <button
              onClick={() => setSelectedCategory("All")}
              className={cn(
                "whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold border transition-all duration-200",
                selectedCategory === "All"
                  ? "bg-black text-white border-black"
                  : "bg-white text-black border-zinc-200 hover:border-black"
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "whitespace-nowrap px-6 py-2 rounded-full text-sm font-bold border transition-all duration-200",
                  selectedCategory === cat.name
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-zinc-200 hover:border-black"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Product Feed */}
      <section className="px-4 md:px-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="aspect-[4/5] bg-zinc-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  addToCart={addToCart}
                />
              ))
            ) : (
              <div className="col-span-full py-20 text-center text-zinc-400">
                <p>No products found in this category.</p>
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="mt-32 border-t border-zinc-100 py-12 text-center">
        <p className="text-zinc-400 font-medium">
          © 2024 DROP. All rights reserved.
        </p>
      </footer>
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
    </div>
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
