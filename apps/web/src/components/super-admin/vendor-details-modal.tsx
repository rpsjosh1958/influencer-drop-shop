"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  Package,
  ShoppingBag,
  DollarSign,
  Store,
  Ban,
  CheckCircle,
  Briefcase,
  Calendar,
} from "lucide-react";
import { StoreConfig } from "@/components/shop/store-provider";
import {
  collection,
  getDocs,
  getCountFromServer,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface VendorDetailsModalProps {
  store: StoreConfig;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedStore: StoreConfig) => void;
}

export function VendorDetailsModal({
  store,
  isOpen,
  onClose,
  onUpdate,
}: VendorDetailsModalProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    products: 0,
    services: 0,
    orders: 0,
    bookings: 0,
    revenue: 0,
  });
  const [suspending, setSuspending] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!store?.id) return;
    setLoading(true);
    try {
      // 1. Get Product Count
      const productsSnap = await getCountFromServer(
        collection(db, "stores", store.id, "products")
      );

      // 2. Get Service Count
      const servicesSnap = await getCountFromServer(
        collection(db, "stores", store.id, "services")
      );

      // 3. Get Booking Count
      const bookingsSnap = await getCountFromServer(
        collection(db, "stores", store.id, "bookings")
      );

      // 4. Get Orders (for Count & Revenue)
      const ordersSnap = await getDocs(
        collection(db, "stores", store.id, "orders")
      );
      
      const paidOrders = ordersSnap.docs.filter(d => 
        ["paid", "open", "packaged", "sent-out", "delivered"].includes(d.data().status)
      );
      
      const totalRevenue = paidOrders.reduce(
        (acc, doc) => acc + (doc.data().total || 0),
        0
      );

      setStats({
        products: productsSnap.data().count,
        services: servicesSnap.data().count,
        orders: ordersSnap.size,
        bookings: bookingsSnap.data().count,
        revenue: totalRevenue,
      });
    } catch (error) {
      console.error("Error fetching vendor details:", error);
    } finally {
      setLoading(false);
    }
  }, [store?.id]);

  useEffect(() => {
    if (isOpen && store) {
      fetchDetails();
    }
  }, [isOpen, store, fetchDetails]);

  const toggleSuspension = async () => {
    const isSuspended = !!store.isSuspended;
    const action = isSuspended ? "lift suspension" : "suspend";

    if (
      !confirm(
        `Are you sure you want to ${action} for ${
          store.name || "this store"
        }? This will override their store status.`
      )
    )
      return;

    setSuspending(true);
    try {
      await updateDoc(doc(db, "stores", store.id), {
        isSuspended: !isSuspended,
      });
      onUpdate({ ...store, isSuspended: !isSuspended });
    } catch (error) {
      console.error("Suspension failed", error);
      alert("Failed to update suspension status");
    } finally {
      setSuspending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 w-full max-w-2xl rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center border border-zinc-700">
              {store.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.logo}
                  alt={`${store.name} logo`}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Store className="w-6 h-6 text-zinc-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {store.name || "Untitled Store"}
                {store.isVerified && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
                {store.isSuspended && (
                  <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full border border-red-500/20">
                    SUSPENDED
                  </span>
                )}
              </h2>
              <p className="text-sm text-zinc-400">/{store.slug || "no-slug"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Main Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue - Primary Focus */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <DollarSign size={28} />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                    Est. Total Revenue
                  </p>
                  <p className="text-2xl font-black text-white">
                    {loading
                      ? "GHS --"
                      : `GHS ${stats.revenue.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Orders */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500">
                    <ShoppingBag size={16} />
                  </div>
                </div>
                <div className="text-xl font-black text-white">
                  {loading ? "-" : stats.orders}
                </div>
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">
                  Orders
                </div>
              </div>
              {/* Bookings */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-center">
                <div className="flex justify-center mb-2">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                    <Calendar size={16} />
                  </div>
                </div>
                <div className="text-xl font-black text-white">
                  {loading ? "-" : stats.bookings}
                </div>
                <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider">
                  Bookings
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Stats: Inventory */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Inventory & Offerings
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                    <Package size={18} />
                  </div>
                  <span className="text-sm font-bold text-zinc-300">
                    Products
                  </span>
                </div>
                <span className="text-xl font-black text-white pr-2">
                  {loading ? "-" : stats.products}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400">
                    <Briefcase size={18} />
                  </div>
                  <span className="text-sm font-bold text-zinc-300">
                    Services
                  </span>
                </div>
                <span className="text-xl font-black text-white pr-2">
                  {loading ? "-" : stats.services}
                </span>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Store Information
            </h3>
            <div className="bg-zinc-950 rounded-xl border border-zinc-800 divide-y divide-zinc-800">
              <div className="p-4 flex justify-between">
                <span className="text-zinc-500 text-sm">Owner ID</span>
                <span className="text-white text-sm font-mono truncate max-w-[200px]">
                  {store.ownerId}
                </span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-zinc-500 text-sm">Current Plan</span>
                <span className="text-white text-sm capitalize">
                  {store.plan || "Basic"}
                </span>
              </div>
              <div className="p-4 flex justify-between">
                <span className="text-zinc-500 text-sm">Status</span>
                <span className="text-white text-sm capitalize">
                  {store.status}
                </span>
              </div>
              {store.payoutConfig && (
                <div className="p-4 space-y-3">
                  <span className="text-zinc-500 text-xs font-black uppercase tracking-widest block">
                    Payout Destination
                  </span>
                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Method</span>
                      <span className="text-white font-bold capitalize">
                        {store.payoutConfig.provider}{" "}
                        {store.payoutConfig.network &&
                          `(${store.payoutConfig.network})`}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Bank</span>
                      <span className="text-white font-bold">
                        {store.payoutConfig.bankName || "Mobile Money"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Account Name</span>
                      <span className="text-white font-bold">
                        {store.payoutConfig.accountName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Account Number</span>
                      <span className="text-white font-mono">
                        {store.payoutConfig.accountNumber}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions Danger Zone */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Administrative Actions
            </h3>
            <div className="bg-red-950/10 border border-red-900/20 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-full text-red-500">
                  <Ban size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white">Suspend Store</h4>
                  <p className="text-xs text-red-400/80 max-w-xs">
                    Suspension overrides the vendor&apos;s settings. The store will
                    be inaccessible to customers until lifted.
                  </p>
                </div>
              </div>
              <button
                onClick={toggleSuspension}
                disabled={suspending}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border ${
                  store.isSuspended
                    ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600"
                    : "bg-red-500 text-white border-red-600 hover:bg-red-600"
                }`}
              >
                {suspending
                  ? "Processing..."
                  : store.isSuspended
                  ? "Lift Suspension"
                  : "Suspend Store"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
