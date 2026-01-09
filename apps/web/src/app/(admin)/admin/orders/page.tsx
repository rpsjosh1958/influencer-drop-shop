"use client";

import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { generateOrdersPDF } from "@/lib/pdf-generator";
import { db } from "@/lib/firebase";
import { Order } from "@/types";
import {
  Search,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  Eye,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AdminOrderModal } from "@/components/admin/admin-order-modal";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { startOfDay, endOfDay, isBefore, isAfter } from "date-fns";

const ITEMS_PER_PAGE_OPTIONS = [20, 50, 100, 200];

export default function OrdersPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [storeConfig, setStoreConfig] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false); // NEW

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Selected Order for Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!storeId) return;

    // Listen to store-specific orders
    const q = query(
      collection(db, "stores", storeId, "orders"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];
      setOrders(items);
      setLoading(false);
    });

    // Fetch Store Config for PDF
    getDoc(doc(db, "stores", storeId)).then((snap) => {
      if (snap.exists()) setStoreConfig(snap.data());
    });

    return () => unsub();
  }, [storeId]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search Term Filter
      const customerInfo =
        (order.customerName || "") +
        " " +
        (order.customerEmail || "") +
        " " +
        (order.shipping?.address || "") +
        " " +
        (order.shipping?.city || "") +
        " " +
        (order.shipping?.country || "");

      if (
        searchTerm &&
        !customerInfo.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

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
  }, [orders, statusFilter, startDate, endDate, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportPDF = (scope: "current" | "filtered" | "all") => {
    if (!storeConfig) return;

    let ordersToExport: Order[] = [];
    switch (scope) {
      case "current":
        ordersToExport = paginatedOrders;
        break;
      case "filtered":
        ordersToExport = filteredOrders;
        break;
      case "all":
        ordersToExport = orders;
        break;
    }

    generateOrdersPDF(ordersToExport, {
      fileName: `orders-${scope}-${new Date().toISOString().split("T")[0]}.pdf`,
      storeName: storeConfig.name,
      storeAddress: storeConfig.address,
      storePhone: storeConfig.phone,
      storeIcon: storeConfig.logo || storeConfig.icon,
      columns: [
        { header: "#", dataKey: "id" },
        { header: "Customer", dataKey: "customerInfo" },
        { header: "Date", dataKey: "orderDate" },
        { header: "Items", dataKey: "itemsSummary" },
        { header: "Total", dataKey: "total" },
        { header: "Status", dataKey: "status" },
      ],
    });
  };

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

  if (storeLoading || !storeId) {
    return <div className="p-8">Loading store context...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
            <p className="text-zinc-500 text-sm">Manage customer orders</p>
          </div>
          {/* Mobile Export Actions could go here or hide */}
        </div>

        <div className="flex flex-wrap items-center gap-2 gap-y-3">
          {/* Search */}
          <div className="relative h-9">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              size={14}
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="h-full pl-9 pr-3 rounded-lg border border-zinc-200 bg-zinc-50 text-sm text-black outline-none focus:ring-2 focus:ring-black w-40 lg:w-48"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-2 text-black rounded-lg border border-zinc-200 bg-zinc-50 text-sm outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">Status: All</option>
            <option value="open">Open / Paid</option>
            <option value="packaged">Packaged</option>
            <option value="sent-out">Sent Out</option>
            <option value="delivered">Delivered</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1 bg-zinc-50 border border-zinc-200 rounded-lg px-2 h-9 z-20">
            <ReactDatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              placeholderText="From"
              className="bg-transparent text-sm outline-none w-20 text-black cursor-pointer text-center"
              popperClassName="!z-[60]"
            />
            <span className="text-zinc-300">-</span>
            <ReactDatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate ?? undefined}
              placeholderText="To"
              className="bg-transparent text-sm outline-none w-20 text-black cursor-pointer text-center"
              popperClassName="!z-[60]"
            />
          </div>

          {/* Export Actions */}
          <div className="relative ml-2 z-20">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-9 px-4 bg-black hover:bg-zinc-800 text-white text-xs font-bold uppercase rounded-lg transition-colors flex items-center gap-2"
            >
              Export PDF
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-1 flex flex-col gap-1 z-50">
                <button
                  onClick={() => {
                    handleExportPDF("current");
                    setShowExportMenu(false);
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-black dark:text-zinc-200 flex justify-between"
                >
                  <span>Current Page</span>
                  <span className="text-zinc-400 text-xs text-right bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                    {paginatedOrders.length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    handleExportPDF("filtered");
                    setShowExportMenu(false);
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-black dark:text-zinc-200 flex justify-between"
                >
                  <span>Filtered Results</span>
                  <span className="text-zinc-400 text-xs text-right bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                    {filteredOrders.length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    handleExportPDF("all");
                    setShowExportMenu(false);
                  }}
                  className="text-left px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg text-black dark:text-zinc-200 flex justify-between"
                >
                  <span>All Orders (Total)</span>
                  <span className="text-zinc-400 text-xs text-right bg-zinc-100 dark:bg-zinc-800 px-1 rounded">
                    {orders.length}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
          Loading orders...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-200">
          <ShoppingBag className="w-12 h-12 text-zinc-300 mb-4" />
          <h3 className="text-lg font-medium">No orders found</h3>
          <p className="text-zinc-500">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {/* Scrollable List Container */}
          <div className="flex-1 overflow-y-auto min-h-0 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900 scrollbar-thin scrollbar-thumb-zinc-200">
            {/* Table Header (Sticky) */}
            <div className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between text-xs font-bold uppercase text-zinc-400 tracking-wider">
              <span>Customer</span>
              <span className="text-right">Order Info</span>
            </div>

            {/* List Items */}
            <div className="p-2 space-y-2">
              {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="group bg-white dark:bg-zinc-900 p-4 px-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-zinc-100 rounded-full flex items-center justify-center font-black text-xs text-zinc-600">
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

                    <div className="md:hidden flex flex-col items-end gap-1">
                      <span className="text-[10px] text-zinc-400 font-medium">
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
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-2 shrink-0 border-t border-zinc-100 dark:border-zinc-800">
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
        storeId={storeId!}
      />
    </div>
  );
}
