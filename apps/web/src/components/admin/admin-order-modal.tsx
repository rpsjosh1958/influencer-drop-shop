"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Truck, CheckCircle2, Circle } from "lucide-react";
import {
  doc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import { Portal } from "@/components/ui/portal";
import { formatCurrency } from "@/lib/utils";

interface AdminOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  storeId?: string;
  onUpdate?: () => void;
}

const STATUSES = [
  {
    id: "open",
    label: "Open",
    color: "bg-blue-100 text-blue-700",
    icon: Circle,
  },
  {
    id: "packaged",
    label: "Packaged",
    color: "bg-yellow-100 text-yellow-700",
    icon: Package,
  },
  {
    id: "sent-out",
    label: "Sent Out",
    color: "bg-purple-100 text-purple-700",
    icon: Truck,
  },
  {
    id: "delivered",
    label: "Delivered",
    color: "bg-green-100 text-green-700",
    icon: CheckCircle2,
  },
];

export function AdminOrderModal({
  isOpen,
  onClose,
  order,
  storeId,
  onUpdate,
}: AdminOrderModalProps) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setCurrentStatus(order.status);
    }
  }, [order]);

  if (!order) return null;

  const handleStatusChange = async (newStatus: string) => {
    if (!order || !storeId || updating) return;
    setUpdating(true);
    setCurrentStatus(newStatus);

    try {
      const orderRef = doc(db, "stores", storeId, "orders", order.id);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Add timeline event
      await addDoc(collection(db, "stores", storeId, "orders", order.id, "timeline"), {
        status: newStatus,
        message: `Order status updated to ${newStatus}`,
        createdAt: serverTimestamp(),
      });

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Error updating order status:", error);
      setCurrentStatus(order.status); // Revert on error
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && order && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col border border-zinc-200 dark:border-zinc-800"
            >
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter">
                    Order Details
                  </h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    #{order.id.slice(0, 8)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Status Section */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3 tracking-wider">
                    Order Status
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STATUSES.map((status) => {
                      const Icon = status.icon;
                      const isActive =
                        currentStatus === status.id ||
                        (status.id === "open" && currentStatus === "paid");
                      return (
                        <button
                          key={status.id}
                          onClick={() => handleStatusChange(status.id)}
                          disabled={updating}
                          className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                            isActive
                              ? `border-transparent ring-2 ring-offset-2 ring-black ${status.color}`
                              : "border-zinc-200 hover:border-zinc-300 text-zinc-500"
                          } ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          <Icon size={20} />
                          <span className="text-xs font-bold">
                            {status.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3 tracking-wider">
                      Customer
                    </h4>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-1 text-sm border border-zinc-100 dark:border-zinc-800">
                      <p className="font-bold text-base text-zinc-900 dark:text-white">
                        {order.customerName || "Guest User"}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">{order.customerEmail}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">{order.shipping?.phone}</p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3 tracking-wider">
                      Shipping To
                    </h4>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl space-y-1 text-sm border border-zinc-100 dark:border-zinc-800">
                      <p className="text-zinc-900 dark:text-white">{order.shipping?.street}</p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {order.shipping?.city}, {order.shipping?.country}
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">{order.shipping?.zip}</p>
                    </div>
                  </div>

                  {/* Customer Note */}
                  {order.customerNote && (
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase text-zinc-400 mb-2 tracking-wider">
                        Note from Customer
                      </h4>
                      <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 p-4 rounded-xl text-sm italic text-yellow-900 dark:text-yellow-200">
                        "{order.customerNote}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3 tracking-wider">
                    Items ({order.items.length})
                  </h4>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-3 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="h-16 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              item.imageUrl ||
                              item.image ||
                              item.images?.[0] ||
                              "/placeholder.png"
                            }
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-zinc-900 dark:text-white text-sm line-clamp-1">
                            {item.name}
                          </p>
                          {item.selectedVariant && (
                            <p className="text-xs text-zinc-500 font-medium">
                              {item.selectedVariant.name}
                            </p>
                          )}
                          <p className="text-xs text-zinc-500">
                            Qty: {item.quantity} × {formatCurrency(item.selectedVariant?.price || item.price)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-zinc-900 dark:text-white text-sm">
                            {formatCurrency((item.selectedVariant?.price || item.price) * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="font-bold text-zinc-400 text-lg uppercase tracking-widest">
                      Total Amount
                    </span>
                    <span className="font-black text-zinc-900 dark:text-white text-2xl">
                      {formatCurrency(order.total)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
