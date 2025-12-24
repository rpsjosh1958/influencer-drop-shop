"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, X, Loader2, ShoppingBag } from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useShopUI } from "@/context/shop-ui-context";
import { useParams } from "next/navigation";

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: any;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    imageUrl?: string;
    images?: string[];
  }[];
}

interface OrdersDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function OrdersDropdown({ isOpen, onClose, user }: OrdersDropdownProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { openOrderDetails } = useShopUI();
  const params = useParams();
  const storeId = params.storeId as string;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    async function fetchOrders() {
      if (!user || !isOpen || !storeId) return;

      setLoading(true);
      try {
        const q = query(
          collection(db, "stores", storeId, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user, isOpen, storeId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          />

          {/* Dropdown Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-24 left-4 right-4 md:left-auto md:right-6 md:w-full md:max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[75vh] z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-black text-white rounded-lg">
                  <Package size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Your Orders</h3>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    Recent purchases
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={18} className="text-zinc-400" />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2">
                  <Loader2 className="animate-spin" />
                  <span className="text-xs">Loading orders...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-3 text-center px-6">
                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center">
                    <ShoppingBag size={20} className="opacity-50" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-600">
                      No orders yet
                    </p>
                    <p className="text-xs mt-1">
                      Start adding items to your bag to see them here.
                    </p>
                  </div>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => {
                      onClose();
                      openOrderDetails(order.id);
                    }}
                    className="group p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black bg-zinc-100 px-2 py-1 rounded text-zinc-600">
                            #{order.id.slice(0, 6).toUpperCase()}
                          </span>
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                              order.status === "paid" ||
                              order.status === "delivered" ||
                              order.status === "completed"
                                ? "bg-green-50 text-green-600 border-green-100"
                                : order.status === "sent-out"
                                ? "bg-blue-50 text-blue-600 border-blue-100"
                                : "bg-yellow-50 text-yellow-600 border-yellow-100"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium mt-1">
                          {order.createdAt
                            ?.toDate()
                            .toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                        </p>
                      </div>
                      <p className="font-bold text-sm">
                        GHS {order.total.toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div
                          key={`${order.id}-${idx}`}
                          className="flex items-center gap-3 text-xs"
                        >
                          <div className="w-8 h-8 rounded bg-zinc-200 overflow-hidden flex-shrink-0 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                item.imageUrl ||
                                item.image ||
                                item.images?.[0] ||
                                "/placeholder.png"
                              }
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-medium truncate">{item.name}</p>
                            <p className="text-zinc-400">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
