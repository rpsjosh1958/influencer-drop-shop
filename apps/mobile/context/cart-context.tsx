import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "@/context/store-context";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant?: { id: string; name: string; price?: number };
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (
    id: string,
    variantId: string | undefined,
    delta: number
  ) => void;
  removeFromCart: (id: string, variantId?: string) => void;
  clearCart: () => void;
  total: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const EMPTY_CART: CartItem[] = [];
// v2: carts saved under the old "cart-{storeId}" key could hold another
// store's items (the store-switch bug below), which checkout then rejects.
// A new key starts everyone clean once instead of loading those.
const cartKey = (storeId: string) => `cart-v2-${storeId}`;

export function CartProvider({ children }: { children: ReactNode }) {
  const { storeId } = useStore();
  // One cart per store (a checkout pays a single store), tagged with the
  // store it belongs to. This provider sits at the app root and outlives
  // store switches, so the cart used to be loaded once at launch and then
  // carried into whatever store you switched to — and saved under that
  // store's key, so checkout sent store A's items to store B.
  const [saved, setSaved] = useState<{ storeId: string; items: CartItem[] } | null>(null);
  const cart = saved && saved.storeId === storeId ? saved.items : EMPTY_CART;

  // Load the current store's cart whenever the store changes.
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    AsyncStorage.getItem(cartKey(storeId))
      .then((json) => {
        if (cancelled) return;
        // Keep a change made in the moment before this load finished.
        setSaved((prev) =>
          prev?.storeId === storeId ? prev : { storeId, items: json ? JSON.parse(json) : [] }
        );
      })
      .catch((e) => console.error("Failed to load cart", e));
    return () => {
      cancelled = true;
    };
  }, [storeId]);

  // Every change goes through here: applies to this store's items only and
  // persists under this store's key.
  const updateCart = useCallback(
    (change: (prev: CartItem[]) => CartItem[]) => {
      if (!storeId) return;
      setSaved((prev) => {
        const items = change(prev?.storeId === storeId ? prev.items : []);
        AsyncStorage.setItem(cartKey(storeId), JSON.stringify(items)).catch((e) =>
          console.error("Failed to save cart to storage", e)
        );
        return { storeId, items };
      });
    },
    [storeId]
  );

  const addToCart = useCallback(
    (newItem: Omit<CartItem, "quantity">) =>
      updateCart((prev) => {
        const existing = prev.find(
          (item) =>
            item.id === newItem.id && item.variant?.id === newItem.variant?.id
        );
        return existing
          ? prev.map((item) =>
              item === existing ? { ...item, quantity: item.quantity + 1 } : item
            )
          : [...prev, { ...newItem, quantity: 1 }];
      }),
    [updateCart]
  );

  const updateQuantity = useCallback(
    (id: string, variantId: string | undefined, delta: number) =>
      updateCart((prev) =>
        prev
          .map((item) =>
            item.id === id && item.variant?.id === variantId
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item
          )
          .filter((item) => item.quantity > 0)
      ),
    [updateCart]
  );

  const removeFromCart = useCallback(
    (id: string, variantId?: string) =>
      updateCart((prev) =>
        prev.filter((item) => !(item.id === id && item.variant?.id === variantId))
      ),
    [updateCart]
  );

  const clearCart = useCallback(() => updateCart(() => []), [updateCart]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
