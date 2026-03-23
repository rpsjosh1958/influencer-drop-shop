"use client";

import { useState, useMemo } from "react";
import { X, Search, Plus, Minus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Product, ProductVariant } from "@/types";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { db } from "@/lib/firebase";
import { doc, runTransaction, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { formatCurrency } from "@/lib/utils";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Portal } from "@/components/ui/portal";

interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

interface CartItem {
  product: Product;
  variant?: ProductVariant;
  quantity: number;
}

export function ManualOrderModal({ isOpen, onClose, products = [] }: ManualOrderModalProps) {
  const { storeId, storeName } = useAdminStore();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderStatus, setOrderStatus] = useState("paid");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search Filter
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    return products.filter((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  // Cart Totals
  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => {
      const price = item.variant?.price || item.product.price;
      return acc + price * item.quantity;
    }, 0);
  }, [cart]);

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && i.variant?.id === variant?.id
      );
      if (existing) {
        // limit by stock
        const maxStock = variant ? variant.stock : product.stock;
        if (existing.quantity >= maxStock) return prev;
        
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) => {
      const newCart = [...prev];
      const item = newCart[index];
      const maxStock = item.variant ? item.variant.stock : item.product.stock;
      
      const newQ = item.quantity + delta;
      if (newQ > 0 && newQ <= maxStock) {
        newCart[index] = { ...item, quantity: newQ };
      }
      return newCart;
    });
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return alert("Please add at least one item.");
    if (!customerName.trim()) return alert("Please enter a customer name.");
    if (!storeId) return;

    setIsSubmitting(true);
    try {
      await runTransaction(db, async (transaction) => {
        // 1. Read all product docs to ensure stock
        const productReads = await Promise.all(
          cart.map(async (item) => {
            const ref = doc(db, "stores", storeId, "products", item.product.id);
            const snapshot = await transaction.get(ref);
            return { ref, snapshot, item };
          })
        );

        // 2. Validate availability
        for (const { snapshot, item } of productReads) {
          if (!snapshot.exists()) throw new Error(`Product ${item.product.name} no longer exists.`);
          const productData = snapshot.data();

          if (item.variant) {
            const variants = productData.variants || [];
            const variant = variants.find((v: any) => v.id === item.variant!.id);
            if (!variant) throw new Error(`Variant ${item.variant.name} no longer exists.`);
            if (variant.stock < item.quantity) {
              throw new Error(`Not enough stock for ${item.product.name} (${item.variant.name}). Only ${variant.stock} left.`);
            }
          } else {
            const currentStock = productData.stock ?? 0;
            if (currentStock < item.quantity) {
              throw new Error(`Not enough stock for ${item.product.name}. Only ${currentStock} left.`);
            }
          }
        }

        // 3. Write stock deductions
        for (const { ref, snapshot, item } of productReads) {
          const productData = snapshot.data()!;
          if (item.variant) {
            const updatedVariants = (productData.variants || []).map((v: any) => 
               v.id === item.variant!.id ? { ...v, stock: v.stock - item.quantity } : v
            );
            const newTotalStock = (productData.stock ?? 0) - item.quantity;
            transaction.update(ref, { variants: updatedVariants, stock: newTotalStock });
          } else {
            const newStock = (productData.stock ?? 0) - item.quantity;
            transaction.update(ref, { stock: newStock });
          }
        }
      });

      // 4. Create Order Document
      const orderItems = cart.map((c) => ({
        id: c.product.id,
        name: c.product.name,
        price: c.variant?.price || c.product.price,
        quantity: c.quantity,
        selectedVariant: c.variant || null,
        imageUrl: c.product.images?.[0] || c.product.imageUrl || "",
      }));

      const orderData = {
        items: orderItems,
        total: cartTotal,
        shipping: {
          fullName: customerName,
          email: customerEmail || "manual@store.com",
          phone: customerPhone,
          address: "Manual Entry/In-Person",
        },
        status: orderStatus,
        paymentMethod: "manual", // Skips wallet processing
        isManual: true,
        createdAt: serverTimestamp(),
        userId: "manual_entry",
        customerEmail: customerEmail || "manual@store.com",
        customerName: customerName,
        storeId,
        storeName: storeName || "Store",
      };

      await addDoc(collection(db, "stores", storeId, "orders"), orderData);

      // 5. Invalidate Queries
      queryClient.invalidateQueries({ queryKey: ["orders", storeId] });
      queryClient.invalidateQueries({ queryKey: ["products", storeId] });

      // Reset and Close
      setCart([]);
      setCustomerName("");
      setCustomerEmail("");
      setCustomerPhone("");
      onClose();
    } catch (error: any) {
      console.error("Manual order error:", error);
      alert(error.message || "Failed to create manual order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
          onClick={() => !isSubmitting && onClose()}
        />
      <div className="relative bg-white dark:bg-zinc-900 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-zinc-200 dark:border-zinc-800">
        
        {/* Left Side: Product Selection */}
        <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden bg-zinc-50 dark:bg-zinc-950/50">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
            <h2 className="text-lg font-bold mb-3">Select Products</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredProducts.map((p) => (
              <div key={p.id} className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden shrink-0">
                    {(p.images?.[0] || p.imageUrl) && (
                      <img src={p.images?.[0] || p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{p.name}</h3>
                    {!p.hasVariants && (
                      <p className="text-xs text-zinc-500">
                        {p.stock} in stock • {formatCurrency(p.price)}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="shrink-0 flex flex-wrap gap-2 justify-end">
                  {p.hasVariants ? (
                    p.variants?.map((v) => (
                      <button
                        key={v.id}
                        disabled={v.stock <= 0}
                        onClick={() => addToCart(p, v)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-medium transition-colors"
                      >
                        <Plus size={12} />
                        {v.name} ({v.stock}) - {formatCurrency(v.price)}
                      </button>
                    ))
                  ) : (
                    <button
                      disabled={p.stock <= 0}
                      onClick={() => addToCart(p)}
                      className="px-3 py-1.5 bg-black dark:bg-white text-white dark:text-black disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-10 text-zinc-500 text-sm">
                No products found.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Order Summary & Customer Info */}
        <div className="w-full md:w-96 flex flex-col bg-white dark:bg-zinc-900">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShoppingBag size={18} /> Current Order
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Cart Items */}
            <div className="space-y-3 min-h-[150px]">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    {item.variant && <span className="text-xs text-zinc-500 block truncate">{item.variant.name}</span>}
                    <span className="text-xs font-semibold">{formatCurrency(item.variant?.price || item.product.price)}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1 shrink-0">
                    <button onClick={() => updateQuantity(idx, -1)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"><Minus size={14} /></button>
                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQuantity(idx, 1)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeCartItem(idx)} className="ml-2 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors shrink-0">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="text-zinc-500 text-sm text-center py-6">No items added yet.</p>
              )}
            </div>

            <hr className="border-zinc-200 dark:border-zinc-800" />

            {/* Customer Details */}
            <h3 className="font-semibold text-sm mb-2">Customer Details</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              <input
                type="email"
                placeholder="Email Address (Optional)"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              <input
                type="tel"
                placeholder="Phone Number (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
              />
              <select
                value={orderStatus}
                onChange={(e) => setOrderStatus(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm outline-none focus:border-black dark:focus:border-white transition-colors"
              >
                <option value="paid">Status: Paid</option>
                <option value="delivered">Status: Delivered</option>
                <option value="open">Status: Open/Unpaid</option>
              </select>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 shrink-0">
            <div className="flex justify-between items-end mb-4">
              <span className="text-zinc-500 text-sm">Total</span>
              <span className="text-2xl font-black">{formatCurrency(cartTotal)}</span>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || cart.length === 0 || !customerName.trim()}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-black/10"
            >
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Complete Order"}
            </button>
            <p className="text-center text-[10px] text-zinc-400 mt-2 uppercase tracking-wider font-semibold">
              Stock will be deducted automatically
            </p>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
}
