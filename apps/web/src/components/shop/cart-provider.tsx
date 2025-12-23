"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Product, ProductVariant } from "@/types";

export interface CartItem extends Product {
  quantity: number;
  selectedVariant?: ProductVariant;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, variant?: ProductVariant) => void;
  updateQuantity: (
    productId: string,
    variantId: string | undefined,
    delta: number
  ) => void;
  // setItemQuantity: (productId: string, quantity: number) => void; // Removing simple set for now to simplify
  removeFromCart: (productId: string, variantId?: string) => void;
  clearCart: () => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  lastAddedItem: Product | null;
  showAddedToast: boolean;
  setShowAddedToast: (show: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState<Product | null>(null);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("drop-cart");
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
    setMounted(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("drop-cart", JSON.stringify(cart));
    }
  }, [cart, mounted]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart((prev) => {
      // Unique ID for cart item is ProductID + VariantID (if exists)
      const existing = prev.find(
        (item) =>
          item.id === product.id && item.selectedVariant?.id === variant?.id
      );

      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.selectedVariant?.id === variant?.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1, selectedVariant: variant }];
    });
    // setIsCartOpen(true); // Don't open cart anymore
    setLastAddedItem(product);
    setShowAddedToast(true);
  };

  const updateQuantity = (
    productId: string,
    variantId: string | undefined,
    delta: number
  ) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === productId && item.selectedVariant?.id === variantId) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(item.id === productId && item.selectedVariant?.id === variantId)
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((sum, item) => {
    const price = item.selectedVariant?.price || item.price;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        total,
        isCartOpen,
        setIsCartOpen,
        lastAddedItem,
        showAddedToast,
        setShowAddedToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
