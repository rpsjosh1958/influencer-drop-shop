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

// Local Order interface removed in favor of @/types import

interface AdminOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  storeId?: string;
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
}: AdminOrderModalProps) {
  const [updating, setUpdating] = useState(false);
  // Optimistic status state
  const [currentStatus, setCurrentStatus] = useState<string>("");

  useEffect(() => {
    if (order) {
      setCurrentStatus(order.status);
    }
  }, [order]);

  if (!order) return null;

  const handleStatusChange = async (newStatus: string) => {
    // 1. Optimistic Update
    const oldStatus = currentStatus;
    setCurrentStatus(newStatus);
    setUpdating(true);

    try {
      if (!storeId) throw new Error("Store ID is missing");
      const ref = doc(db, "stores", storeId, "orders", order.id);
      await updateDoc(ref, { status: newStatus });

      // Create Notification
      if (order.userId) {
        // Ensure we have the user ID
        await addDoc(collection(db, "notifications"), {
          userId: order.userId,
          type: "order_update",
          title: `Order ${newStatus.replace("-", " ")} 📦`,
          message: `Your order #${order.id
            .slice(0, 8)
            .toUpperCase()} is now ${newStatus.replace("-", " ")}.`,
          read: false,
          orderId: order.id,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Failed to update status", error);
      // Revert if failed
      setCurrentStatus(oldStatus);
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

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
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-zinc-50 px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs bg-black text-white px-2 py-1 rounded">
                    #{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {order.createdAt?.seconds
                      ? new Date(
                          order.createdAt.seconds * 1000,
                        ).toLocaleString()
                      : "Date N/A"}
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-200 black rounded-full transition-colors opacity-50 hover:opacity-100"
                >
                  <X color="black" size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 overflow-y-auto space-y-8">
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
                    <div className="bg-zinc-50 p-4 rounded-xl space-y-1 text-sm border border-zinc-100">
                      <p className="font-bold text-base text-black">
                        {order.customerName || "Guest User"}
                      </p>
                      <p className="text-zinc-600">{order.customerEmail}</p>
                      <p className="text-zinc-600">{order.shipping?.phone}</p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-zinc-400 mb-3 tracking-wider">
                      Shipping To
                    </h4>
                    <div className="bg-zinc-50 p-4 rounded-xl space-y-1 text-sm border border-zinc-100">
                      <p className="text-zinc-900">{order.shipping?.street}</p>
                      <p className="text-zinc-600">
                        {order.shipping?.city}, {order.shipping?.country}
                      </p>
                      <p className="text-zinc-600">{order.shipping?.zip}</p>
                    </div>
                  </div>

                  {/* Customer Note */}
                  {order.customerNote && (
                    <div className="col-span-1 md:col-span-2">
                      <h4 className="text-xs font-bold uppercase text-zinc-400 mb-2 tracking-wider">
                        Note from Customer
                      </h4>
                      <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl text-sm italic text-yellow-900">
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
                        className="flex items-center gap-4 p-3 border border-zinc-100 rounded-xl hover:bg-zinc-50 transition-colors"
                      >
                        <div className="h-16 w-16 bg-zinc-200 rounded-lg overflow-hidden flex-shrink-0 relative">
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
                          <p className="font-bold text-black text-sm line-clamp-1">
                            {item.name}
                          </p>
                          {item.selectedVariant && (
                            <p className="text-xs text-zinc-500 font-medium">
                              {item.selectedVariant.name}
                            </p>
                          )}
                          <p className="text-xs text-zinc-500">
                            Qty: {item.quantity} × GHS{" "}
                            {item.selectedVariant?.price || item.price}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black text-sm">
                            GHS{" "}
                            {(
                              (item.selectedVariant?.price || item.price) *
                              item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-6 pt-6 border-t border-zinc-100">
                    <span className="font-bold text-zinc-400 text-lg">
                      Total Amount
                    </span>
                    <span className="font-black text-black text-2xl">
                      GHS {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
