import {
  createContext,
  useContext,
  useState,
  useEffect,
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

export function CartProvider({ children }: { children: ReactNode }) {
  const { storeId } = useStore();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    if (!storeId) return;

    setLoaded(false);
    AsyncStorage.getItem(`cart-${storeId}`).then((json) => {
      if (json) {
        try {
          setCart(JSON.parse(json));
        } catch (e) {
          console.error("Failed to parse cart", e);
          setCart([]);
        }
      } else {
        setCart([]);
      }
      setLoaded(true);
    });
  }, [storeId]);

  useEffect(() => {
    if (loaded && storeId) {
      AsyncStorage.setItem(`cart-${storeId}`, JSON.stringify(cart));
    }
  }, [cart, loaded, storeId]);

  const addToCart = (newItem: Omit<CartItem, "quantity">) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) =>
          item.id === newItem.id && item.variant?.id === newItem.variant?.id
      );
      if (existing) {
        return prev.map((item) =>
          item.id === newItem.id && item.variant?.id === newItem.variant?.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  };

  const updateQuantity = (
    id: string,
    variantId: string | undefined,
    delta: number
  ) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id && item.variant?.id === variantId) {
            return { ...item, quantity: Math.max(0, item.quantity + delta) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string, variantId?: string) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === id && item.variant?.id === variantId))
    );
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

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
