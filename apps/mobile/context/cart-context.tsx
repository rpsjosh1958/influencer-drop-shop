import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useStore } from "@/context/store-context";
import { useMountEffect } from "@/hooks/use-mount-effect";

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

export function CartProvider({ children }: { children: ReactNode }) {
  const { storeId } = useStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 1. Explicit Storage Helper
  const saveCartToStorage = useCallback(
    async (newCart: CartItem[]) => {
      if (!storeId) return;
      try {
        await AsyncStorage.setItem(`cart-${storeId}`, JSON.stringify(newCart));
      } catch (e) {
        console.error("Failed to save cart to storage", e);
      }
    },
    [storeId]
  );

  // 2. Load from storage (Mount Only)
  useMountEffect(() => {
    if (!storeId) return;

    const loadCart = async () => {
      try {
        const json = await AsyncStorage.getItem(`cart-${storeId}`);
        if (json) {
          setCart(JSON.parse(json));
        }
      } catch (e) {
        console.error("Failed to load cart", e);
      } finally {
        setLoaded(true);
      }
    };

    loadCart();
  });

  // 3. Event Handlers (Explicit Actions)
  const addToCart = useCallback(
    (newItem: Omit<CartItem, "quantity">) => {
      setCart((prev) => {
        let nextCart: CartItem[];
        const existing = prev.find(
          (item) =>
            item.id === newItem.id && item.variant?.id === newItem.variant?.id
        );
        if (existing) {
          nextCart = prev.map((item) =>
            item.id === newItem.id && item.variant?.id === newItem.variant?.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        } else {
          nextCart = [...prev, { ...newItem, quantity: 1 }];
        }

        saveCartToStorage(nextCart);
        return nextCart;
      });
    },
    [saveCartToStorage]
  );

  const updateQuantity = useCallback(
    (id: string, variantId: string | undefined, delta: number) => {
      setCart((prev) => {
        const nextCart = prev
          .map((item) => {
            if (item.id === id && item.variant?.id === variantId) {
              return { ...item, quantity: Math.max(0, item.quantity + delta) };
            }
            return item;
          })
          .filter((item) => item.quantity > 0);

        saveCartToStorage(nextCart);
        return nextCart;
      });
    },
    [saveCartToStorage]
  );

  const removeFromCart = useCallback(
    (id: string, variantId?: string) => {
      setCart((prev) => {
        const nextCart = prev.filter(
          (item) => !(item.id === id && item.variant?.id === variantId)
        );
        saveCartToStorage(nextCart);
        return nextCart;
      });
    },
    [saveCartToStorage]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    saveCartToStorage([]);
  }, [saveCartToStorage]);

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
