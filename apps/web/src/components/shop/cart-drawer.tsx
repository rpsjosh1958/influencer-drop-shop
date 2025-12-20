import { useState, useEffect } from "react";
import { useCart } from "./cart-provider";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, ShoppingBag, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

export function CartDrawer() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    total,
    isCartOpen,
    setIsCartOpen,
  } = useCart();

  useBodyScrollLock(isCartOpen);

  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tight">
                YOUR BAG ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-zinc-400">
                  <ShoppingBag size={48} />
                  <p>Your bag is empty. Don't miss out.</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={`${item.id}-${item.selectedVariant?.id || "base"}`}
                    className="flex gap-4"
                  >
                    <div className="relative h-24 w-24 bg-zinc-100 rounded-xl overflow-hidden flex-shrink-0">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-bold">{item.name}</h3>
                        {item.selectedVariant && (
                          <p className="text-xs text-zinc-500 font-medium">
                            {item.selectedVariant.name}
                          </p>
                        )}
                        <p className="text-zinc-500 text-sm">
                          GHS {item.selectedVariant?.price || item.price}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-zinc-100 rounded-lg p-1">
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.selectedVariant?.id,
                                -1
                              )
                            }
                            className="p-1 hover:bg-white rounded-md transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              // Skipping direct setItemQuantity for now as it's complex with variants, rely on +/-
                            }}
                            readOnly
                            className="w-8 text-center text-sm font-medium bg-transparent outline-none appearance-none"
                          />
                          <button
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.selectedVariant?.id,
                                1
                              )
                            }
                            className="p-1 hover:bg-white rounded-md transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <button
                          onClick={() =>
                            removeFromCart(item.id, item.selectedVariant?.id)
                          }
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 border-t border-zinc-100 bg-zinc-50 space-y-4">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>GHS {total.toFixed(2)}</span>
              </div>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  if (user) {
                    router.push("/checkout");
                  } else {
                    router.push("/login");
                  }
                }}
                className={`block w-full text-center py-4 rounded-xl font-bold uppercase tracking-wide transition-all ${
                  cart.length === 0
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    : "bg-black text-white hover:bg-zinc-900 active:scale-95"
                }`}
                disabled={cart.length === 0}
              >
                {user ? "Proceed to Checkout" : "Login to Checkout"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
