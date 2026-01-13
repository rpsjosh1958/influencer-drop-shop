"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package,
  X,
  Loader2,
  ShoppingBag,
  Briefcase,
  Calendar,
  Clock,
} from "lucide-react";
import {
  collectionGroup,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useShopUI } from "@/context/shop-ui-context";
import { useParams } from "next/navigation";
import { Booking, BookingStatus } from "@/types";
import { format, parseISO } from "date-fns";

interface Order {
  id: string;
  total: number;
  status: string;
  storeName?: string;
  storeId?: string;
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

const BOOKING_STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50" },
  confirmed: { label: "Confirmed", color: "text-blue-600", bg: "bg-blue-50" },
  completed: { label: "Completed", color: "text-green-600", bg: "bg-green-50" },
  cancelled: { label: "Cancelled", color: "text-red-600", bg: "bg-red-50" },
  "no-show": { label: "No Show", color: "text-zinc-600", bg: "bg-zinc-100" },
};

export function OrdersDropdown({ isOpen, onClose, user }: OrdersDropdownProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<
    (Booking & { storeName?: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "bookings">("orders");
  const { openOrderDetails, openBookingDetails } = useShopUI();
  const params = useParams();
  const storeId = params.storeId as string;

  useBodyScrollLock(isOpen);

  useEffect(() => {
    async function fetchData() {
      if (!user || !isOpen) return;

      setLoading(true);
      try {
        // Fetch orders
        const ordersQuery = query(
          collectionGroup(db, "orders"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[];
        setOrders(ordersData);

        // Fetch bookings
        const bookingsQuery = query(
          collectionGroup(db, "bookings"),
          where("customerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as (Booking & { storeName?: string })[];
        setBookings(bookingsData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isOpen]);

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
            {/* Header with Tabs */}
            <div className="border-b border-zinc-100 bg-zinc-50/50 shrink-0">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-black text-white rounded-lg">
                    {activeTab === "orders" ? (
                      <Package size={18} />
                    ) : (
                      <Briefcase size={18} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-black">
                      {activeTab === "orders" ? "Your Orders" : "Your Bookings"}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {activeTab === "orders"
                        ? "Recent purchases"
                        : "Scheduled appointments"}
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

              {/* Tabs */}
              <div className="flex px-4 pb-2 gap-2">
                <button
                  onClick={() => setActiveTab("orders")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "orders"
                      ? "bg-black text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Orders {orders.length > 0 && `(${orders.length})`}
                </button>
                <button
                  onClick={() => setActiveTab("bookings")}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === "bookings"
                      ? "bg-black text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Bookings {bookings.length > 0 && `(${bookings.length})`}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-2">
                  <Loader2 className="animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : activeTab === "orders" ? (
                /* ORDERS TAB */
                orders.length === 0 ? (
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
                        openOrderDetails(order.id, order.storeId);
                      }}
                      className="group p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          {order.storeName && (
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">
                              {order.storeName}
                            </p>
                          )}
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
                        <p className="font-bold text-sm text-black">
                          GHS {order.total.toFixed(2)}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {order.items.slice(0, 2).map((item, idx) => (
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
                              <p className="font-medium truncate text-black">
                                {item.name}
                              </p>
                              <p className="text-zinc-400">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-zinc-400">
                            +{order.items.length - 2} more items
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : /* BOOKINGS TAB */
              bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-400 gap-3 text-center px-6">
                  <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center">
                    <Briefcase size={20} className="opacity-50" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-600">
                      No bookings yet
                    </p>
                    <p className="text-xs mt-1">
                      Book a service to see your appointments here.
                    </p>
                  </div>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    onClick={() => {
                      onClose();
                      openBookingDetails(booking.id, booking.storeId);
                    }}
                    className="group p-4 rounded-xl border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-sm text-black">
                          {booking.serviceName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              BOOKING_STATUS_CONFIG[booking.status].bg
                            } ${BOOKING_STATUS_CONFIG[booking.status].color}`}
                          >
                            {BOOKING_STATUS_CONFIG[booking.status].label}
                          </span>
                        </div>
                      </div>
                      <p className="font-bold text-sm text-black">
                        GHS {booking.servicePrice}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {format(parseISO(booking.date), "MMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{booking.startTime}</span>
                      </div>
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
