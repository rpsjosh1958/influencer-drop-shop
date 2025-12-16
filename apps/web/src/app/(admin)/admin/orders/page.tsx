"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { AdminOrderModal } from "@/components/admin/admin-order-modal";
import { startOfDay, endOfDay, isAfter, isBefore } from "date-fns";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Order {
  id: string;
  customerName?: string;
  customerEmail: string;
  total: number;
  status: string;
  items: any[];
  shipping?: any;
  createdAt: any;
}

const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100, 200];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    // Listen to ALL orders (assuming dataset < a few thousands for now)
    // For scale, we'd use server-side cursors.
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setOrders(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ... (inside component)

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status Filter
      if (statusFilter !== "all") {
        if (
          statusFilter === "open" &&
          (order.status === "paid" || order.status === "pending")
        )
          return true;
        if (order.status !== statusFilter) return false;
      }

      // Date Filter
      if (order.createdAt?.seconds) {
        const orderDate = new Date(order.createdAt.seconds * 1000);

        if (startDate) {
          const start = startOfDay(startDate);
          if (isBefore(orderDate, start)) return false;
        }
        if (endDate) {
          const end = endOfDay(endDate);
          if (isAfter(orderDate, end)) return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, startDate, endDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
      case "pending":
      case "paid":
        return "bg-blue-100 text-blue-700";
      case "packaged":
        return "bg-yellow-100 text-yellow-700";
      case "sent-out":
        return "bg-purple-100 text-purple-700";
      case "delivered":
        return "bg-green-100 text-green-700";
      default:
        return "bg-zinc-100 text-zinc-700";
    }
  };

  const getCustomerDisplay = (order: Order) => {
    if (order.customerName) {
      return (
        <div className="flex flex-col">
          <span className="font-bold">{order.customerName}</span>
          <span className="text-xs text-zinc-400">
            {order.shipping?.city}, {order.shipping?.country}
          </span>
        </div>
      );
    }
    return <span className="font-bold">{order.customerEmail}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-zinc-500">Manage and track customer orders</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 text-black px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Status</option>
            <option value="open">Open / Paid</option>
            <option value="packaged">Packaged</option>
            <option value="sent-out">Sent Out</option>
            <option value="delivered">Delivered</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-1 px-2 h-10 w-fit">
            <span className="text-xs font-bold text-zinc-400 uppercase whitespace-nowrap">
              From
            </span>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="Select date"
              className="bg-transparent text-sm outline-none w-24 text-black cursor-pointer"
            />
          </div>
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-1 px-2 h-10 w-fit">
            <span className="text-xs font-bold text-zinc-400 uppercase whitespace-nowrap">
              To
            </span>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate ?? undefined}
              placeholderText="Select date"
              className="bg-transparent text-sm outline-none w-24 text-black cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-500">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200">
          <ShoppingBag className="w-12 h-12 text-zinc-300 mb-4" />
          <h3 className="text-lg font-medium">No orders found</h3>
          <p className="text-zinc-500">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Table Header */}
          <div className="flex items-center justify-between px-2 pb-2 text-xs font-bold uppercase text-zinc-400 tracking-wider">
            <span className="pl-6">Customer</span>
            <span className="pr-6">Order Info</span>
          </div>

          {/* List */}
          <div className="space-y-3">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="group bg-white dark:bg-zinc-900 p-4 px-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 bg-zinc-100 rounded-full flex items-center justify-center font-black text-xs">
                    {order.customerName ? order.customerName.charAt(0) : "@"}
                  </div>
                  {getCustomerDisplay(order)}
                </div>

                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="font-bold">GHS {order.total.toFixed(2)}</p>
                    <p className="text-xs text-zinc-400">
                      {order.items.length} items
                    </p>
                  </div>

                  <div className="hidden md:flex flex-col items-end gap-1 min-w-[100px]">
                    <span className="text-xs text-zinc-400">
                      {new Date(
                        order.createdAt?.seconds * 1000
                      ).toLocaleDateString()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status === "paid" ? "OPEN" : order.status}
                    </span>
                  </div>

                  <div className="md:hidden">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status === "paid" ? "OPEN" : order.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent border border-zinc-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-black"
              >
                {ITEMS_PER_PAGE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span>per page</span>
              <span className="ml-2 pl-2 border-l border-zinc-200">
                Showing{" "}
                <b>
                  {(currentPage - 1) * itemsPerPage + 1} -{" "}
                  {Math.min(currentPage * itemsPerPage, filteredOrders.length)}
                </b>{" "}
                of <b>{filteredOrders.length}</b>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-sm font-medium px-2">
                Page {currentPage} of {totalPages || 1}
              </div>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 border border-zinc-200 rounded-lg disabled:opacity-50 hover:bg-zinc-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      <AdminOrderModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </div>
  );
}

