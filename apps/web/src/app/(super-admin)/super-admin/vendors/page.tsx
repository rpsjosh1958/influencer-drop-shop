"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Search,
  Store,
  MoreVertical,
  BadgeCheck,
  Eye,
  Ghost,
  Lock,
} from "lucide-react";
import { StoreConfig } from "@/components/shop/store-provider";
import { VendorDetailsModal } from "@/components/super-admin/vendor-details-modal";

export default function VendorsPage() {
  const [vendors, setVendors] = useState<StoreConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "basic" | "growth">("all");
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<StoreConfig | null>(
    null
  );

  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActionOpen(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  const fetchVendors = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "stores"));
      const stores = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StoreConfig[];
      setVendors(stores);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (storeId: string, currentStatus: boolean) => {
    if (
      !confirm(
        `Are you sure you want to ${
          currentStatus ? "unverify" : "verify"
        } this vendor?`
      )
    )
      return;

    setProcessing(storeId);
    try {
      await updateDoc(doc(db, "stores", storeId), {
        isVerified: !currentStatus,
      });
      // Update local state
      setVendors((prev) =>
        prev.map((v) =>
          v.id === storeId ? { ...v, isVerified: !currentStatus } : v
        )
      );
    } catch (error) {
      console.error("Verify failed", error);
      alert("Failed to update status");
    } finally {
      setProcessing(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const name = v.name || "";
    const slug = v.slug || "";
    const matchesSearch =
      name.toLowerCase().includes(search.toLowerCase()) ||
      slug.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === "basic") return v.plan !== "growth";
    if (filter === "growth") return v.plan === "growth";
    return true;
  });

  if (loading) return <div>Loading vendors...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Vendor Management
          </h1>
          <p className="text-zinc-400">
            Manage {vendors.length} stores across the platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search stores..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 w-64"
            />
          </div>
          <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-700">
            {["all", "basic", "growth"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as "all" | "basic" | "growth")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  filter === f
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        <table className="w-full text-left">
          <thead className="bg-zinc-900/50 border-b border-zinc-800 text-xs uppercase text-zinc-500 font-bold">
            <tr>
              <th className="p-4">Store Name</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Status</th>
              <th className="p-4">Onboarding</th>
              <th className="p-4">Verification</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filteredVendors.map((vendor) => (
              <tr
                key={vendor.id}
                className="hover:bg-white/5 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      {vendor.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vendor.logo}
                          alt={`${vendor.name} logo`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Store className="w-5 h-5 text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1">
                        {vendor.name}
                        {vendor.isVerified && (
                          <BadgeCheck className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                        )}
                      </div>
                      <div className="text-xs text-zinc-500">
                        /{vendor.slug}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full border ${
                      vendor.plan === "growth"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {vendor.plan === "growth" ? "GROWTH" : "BASIC"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <span className="text-sm text-zinc-300 capitalize block">
                      {vendor.status}
                    </span>
                    {vendor.isSuspended && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase">
                        <Lock size={10} /> Suspended
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      vendor.onboardingStatus === "approved" ? "bg-green-500" :
                      vendor.onboardingStatus === "rejected" ? "bg-red-500" :
                      vendor.onboardingStatus === "needs_more_info" ? "bg-amber-500" : "bg-blue-500"
                    }`} />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      {vendor.onboardingStatus || "PENDING"}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <button
                    onClick={() =>
                      handleVerify(vendor.id, vendor.isVerified || false)
                    }
                    disabled={processing === vendor.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      vendor.isVerified
                        ? "bg-blue-500/10 text-blue-500 border-blue-500/20 hover:bg-blue-500/20"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-white"
                    }`}
                  >
                    {processing === vendor.id ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : vendor.isVerified ? (
                      <>
                        Verified <BadgeCheck size={14} />
                      </>
                    ) : (
                      <>Unverified</>
                    )}
                  </button>
                </td>
                <td className="p-4 text-right relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionOpen(
                        actionOpen === vendor.id ? null : vendor.id
                      );
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"
                  >
                    <MoreVertical size={16} />
                  </button>

                  {actionOpen === vendor.id && (
                    <div className="absolute right-8 top-8 w-48 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="px-4 py-3 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors w-full"
                      >
                        <Eye size={16} /> View Details
                      </button>
                      <button
                        onClick={() => setSelectedVendor(vendor)}
                        className="px-4 py-3 text-left text-sm hover:bg-zinc-800 text-red-500 flex items-center gap-2 transition-colors w-full"
                      >
                        <Ghost size={16} /> Suspend / Manage
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredVendors.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No stores found matching your filters.
          </div>
        )}
      </div>

      <VendorDetailsModal
        isOpen={!!selectedVendor}
        store={selectedVendor!}
        onClose={() => setSelectedVendor(null)}
        onUpdate={(updated) => {
          setVendors((prev) =>
            prev.map((v) => (v.id === updated.id ? updated : v))
          );
          setSelectedVendor(updated);
        }}
      />
    </div>
  );
}
