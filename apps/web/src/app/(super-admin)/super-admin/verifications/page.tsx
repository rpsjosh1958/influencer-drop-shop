"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ShieldCheck, Check, X, CreditCard, Building2 } from "lucide-react";
import { StoreConfig } from "@/components/shop/store-provider";

export default function VerificationsPage() {
  const [requests, setRequests] = useState<StoreConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      // Fetch stores waiting for verification or growth plan approval
      // Assuming 'growth_pending' is the status for paid but unapproved
      const q = query(
        collection(db, "stores"),
        where("plan", "==", "growth_pending")
      );
      // Alternatively, just unverified stores if that's the process
      // const q = query(collection(db, "stores"), where("isVerified", "==", false));

      const querySnapshot = await getDocs(q);
      const stores = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as StoreConfig[];
      setRequests(stores);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (store: StoreConfig) => {
    if (!confirm(`Approve Growth Plan for ${store.name}?`)) return;

    setProcessing(store.id);
    try {
      await updateDoc(doc(db, "stores", store.id), {
        plan: "growth",
        isVerified: true,
        updatedAt: new Date(),
      });
      // Remove from list
      setRequests((prev) => prev.filter((r) => r.id !== store.id));
    } catch (error) {
      console.error("Approval failed", error);
      alert("Failed to approve");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (store: StoreConfig) => {
    if (!prompt(`Reason for rejection (will be sent to ${store.name}):`))
      return;
    // Implement rejection logic (e.g. set status to 'rejected' or revert to basic)
    alert("Rejection logic not yet implemented (needs email integration)");
  };

  if (loading) return <div>Loading requests...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Verifications Queue
        </h1>
        <p className="text-zinc-400">
          Review pending Growth Plan applications ({requests.length}).
        </p>
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 flex flex-col md:flex-row items-center gap-6"
          >
            <div className="w-16 h-16 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
              {request.logo ? (
                <img
                  src={request.logo}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Building2 className="w-8 h-8 text-zinc-500" />
              )}
            </div>

            <div className="flex-1 space-y-2 text-center md:text-left">
              <h3 className="text-xl font-bold text-white flex items-center justify-center md:justify-start gap-2">
                {request.name}
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                  Pending Growth
                </span>
              </h3>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <CreditCard size={14} /> Paid
                </span>
                <span>ID: {request.id}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={() => handleReject(request)}
                disabled={!!processing}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold text-zinc-400 hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-700"
              >
                Reject
              </button>
              <button
                onClick={() => handleApprove(request)}
                disabled={!!processing}
                className="flex-1 md:flex-none px-6 py-3 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
              >
                {processing === request.id ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    Approve
                  </>
                )}
              </button>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="p-12 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <div className="p-4 rounded-full bg-zinc-900">
              <ShieldCheck className="w-8 h-8 opacity-20" />
            </div>
            <p>No pending verifications. You're all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
}
