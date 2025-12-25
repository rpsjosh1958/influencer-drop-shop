"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Package,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useShopUI } from "@/context/shop-ui-context";
import { useParams } from "next/navigation";
import { useStore } from "./store-provider";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  selectedVariant?: {
    name: string;
  };
}

interface Order {
  id: string;
  total: number;
  subtotal: number;
  shipping: number;
  status:
    | "pending"
    | "paid"
    | "packaged"
    | "sent-out"
    | "delivered"
    | "completed";
  createdAt: any;
  items: OrderItem[];
  shippingAddress: {
    city: string;
    country: string;
    street: string;
    zip: string;
  };
}

export function OrderDetailsModal() {
  const { isOrderDetailsOpen, selectedOrderId, closeOrderDetails } =
    useShopUI();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const { store } = useStore();
  const params = useParams();
  const storeId = params.storeId as string;

  useBodyScrollLock(isOrderDetailsOpen);

  useEffect(() => {
    async function fetchOrder() {
      if (!selectedOrderId || !storeId) return;
      setLoading(true);
      try {
        const docRef = doc(db, "stores", storeId, "orders", selectedOrderId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setOrder({ id: snap.id, ...snap.data() } as Order);
        }
      } catch (e) {
        console.error("Failed to fetch order", e);
      } finally {
        setLoading(false);
      }
    }

    if (isOrderDetailsOpen) {
      fetchOrder();
    } else {
      setOrder(null);
    }
  }, [isOrderDetailsOpen, selectedOrderId, storeId]);

  return (
    <AnimatePresence>
      {isOrderDetailsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOrderDetails}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                      SOLD BY {store?.name}
                    </span>
                    {store?.isVerified && (
                      <BadgeCheck
                        size={14}
                        className="text-blue-500 fill-blue-500 text-white"
                      />
                    )}
                  </div>
                  <h2 className="text-xl font-black tracking-tight">
                    ORDER DETAILS
                  </h2>
                  <p className="text-zinc-500 text-xs font-mono mt-1">
                    #{selectedOrderId?.toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={closeOrderDetails}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {loading ? (
                <div className="flex-1 flex items-center justify-center p-12">
                  <Loader2 className="animate-spin text-zinc-300" size={32} />
                </div>
              ) : order ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* Status Stepper */}
                  <div className="relative flex items-center justify-between px-4 mb-4">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-zinc-100 mx-8 -z-10" />

                    {[
                      { id: "paid", label: "Paid", icon: CheckCircle },
                      { id: "packaged", label: "Packaged", icon: Package },
                      { id: "sent-out", label: "Shipped", icon: Truck },
                      { id: "delivered", label: "Delivered", icon: MapPin },
                    ].map((step, idx) => {
                      const steps = [
                        "paid",
                        "packaged",
                        "sent-out",
                        "delivered",
                      ];
                      const currentStatusIndex = steps.indexOf(
                        order.status === "completed"
                          ? "delivered"
                          : order.status
                      );
                      const stepIndex = idx;
                      const isCompleted = stepIndex <= currentStatusIndex;
                      const isCurrent = stepIndex === currentStatusIndex;

                      return (
                        <div
                          key={step.id}
                          className="flex flex-col items-center gap-2 bg-white px-2"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                              isCompleted
                                ? "bg-black border-black text-white"
                                : "bg-white border-zinc-200 text-zinc-300"
                            }`}
                          >
                            <step.icon size={14} />
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              isCompleted ? "text-black" : "text-zinc-300"
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Items */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase text-zinc-400">
                      Items
                    </h3>
                    {order.items.map((item, i) => (
                      <div
                        key={i}
                        className="flex gap-4 p-3 rounded-xl border border-zinc-100 bg-zinc-50/50"
                      >
                        <div className="h-16 w-16 bg-zinc-200 rounded-lg overflow-hidden shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.imageUrl ||
                              item.image ||
                              item.images?.[0] ||
                              "/placeholder.png"
                            }
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="font-bold text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="flex flex-col justify-center text-right">
                          <p className="font-bold text-sm">
                            GHS {item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <MapPin size={16} />
                        <span className="text-xs font-bold uppercase">
                          Shipping Address
                        </span>
                      </div>
                      {order.shippingAddress ? (
                        <div className="text-sm font-medium">
                          <p>{order.shippingAddress.street}</p>
                          <p>
                            {order.shippingAddress.city},{" "}
                            {order.shippingAddress.country}
                          </p>
                          {order.shippingAddress.zip && (
                            <p>{order.shippingAddress.zip}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 italic">
                          Digital / Pickup
                        </p>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <Clock size={16} />
                        <span className="text-xs font-bold uppercase">
                          Order Info
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Ordered</span>
                          <span className="font-medium">
                            {order.createdAt?.toDate().toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Status</span>
                          <span
                            className={`font-bold uppercase text-xs px-2 py-1 rounded-full border ${
                              order.status === "paid" ||
                              order.status === "delivered" ||
                              order.status === "completed"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : order.status === "sent-out"
                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                : order.status === "packaged"
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : "bg-yellow-100 text-yellow-700 border-yellow-200"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="pt-6 border-t border-zinc-100 space-y-2">
                    <div className="flex justify-between text-lg font-black mt-4">
                      <span>TOTAL</span>
                      <span>GHS {Number(order.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-400">
                  Order not found.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
