"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { format } from "date-fns";
import {
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Mail,
  MessageCircle,
} from "lucide-react";
import { Complaint } from "@/types";

export default function AdminComplaintsPage() {
  const { storeId } = useAdminStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "resolved">("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null
  );

  useEffect(() => {
    if (!storeId) return;

    const q = query(
      collection(db, "stores", storeId, "complaints"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Complaint[];
      setComplaints(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [storeId]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    if (!storeId) return;
    try {
      await updateDoc(doc(db, "stores", storeId, "complaints", id), {
        status: newStatus,
      });
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) =>
          prev ? { ...prev, status: newStatus as any } : null
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2">
            Complaints & Support
          </h1>
          <p className="text-zinc-500">
            Manage customer inquiries and resolve issues.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)]">
        {/* List Column */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-zinc-200 flex flex-col overflow-hidden shadow-sm">
          {/* Filters */}
          <div className="p-4 border-b border-zinc-100 flex gap-2">
            {(["all", "unread", "resolved"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
                  filter === f
                    ? "bg-black text-white"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {loading ? (
              <div className="p-4 text-center text-zinc-400">Loading...</div>
            ) : filteredComplaints.length === 0 ? (
              <div className="p-8 text-center">
                <div className="h-10 w-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3 text-zinc-400">
                  <CheckCircle2 size={20} />
                </div>
                <p className="text-zinc-500 font-medium">
                  No complaints found.
                </p>
              </div>
            ) : (
              filteredComplaints.map((complaint) => (
                <button
                  key={complaint.id}
                  onClick={() => setSelectedComplaint(complaint)}
                  className={`w-full text-left p-4 rounded-xl transition-all border ${
                    selectedComplaint?.id === complaint.id
                      ? "bg-zinc-50 border-black shadow-sm"
                      : "bg-white border-transparent hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        complaint.status === "unread"
                          ? "bg-red-100 text-red-600"
                          : complaint.status === "resolved"
                          ? "bg-green-100 text-green-600"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {complaint.status}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {complaint.createdAt?.seconds
                        ? format(
                            new Date(complaint.createdAt.seconds * 1000),
                            "MMM d"
                          )
                        : "Now"}
                    </span>
                  </div>
                  <h4 className="font-bold text-zinc-900 truncate mb-1">
                    {complaint.subject}
                  </h4>
                  <p className="text-sm text-zinc-500 truncate">
                    {complaint.message}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col">
          {selectedComplaint ? (
            <>
              {/* Detail Header */}
              <div className="p-8 border-b border-zinc-100 flex justify-between items-start bg-zinc-50/50">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        selectedComplaint.status === "unread"
                          ? "bg-red-100 text-red-600"
                          : selectedComplaint.status === "resolved"
                          ? "bg-green-100 text-green-600"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {selectedComplaint.status}
                    </span>
                    <span className="text-zinc-400 text-sm">
                      ID: {selectedComplaint.id.slice(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-zinc-900 mb-2">
                    {selectedComplaint.subject}
                  </h2>
                  <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
                    <UserIcon /> {selectedComplaint.customerName} &bull;{" "}
                    {selectedComplaint.customerEmail} &bull;{" "}
                    {selectedComplaint.customerPhone}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleStatusUpdate(selectedComplaint.id, "resolved")
                    }
                    className="h-10 px-4 bg-white border border-zinc-200 rounded-lg text-black text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle2 size={16} /> Mark Resolved
                  </button>
                  <a
                    href={`mailto:${selectedComplaint.customerEmail}?subject=Re: ${selectedComplaint.subject} [Ticket: ${selectedComplaint.id}]`}
                    className="h-10 px-4 bg-black text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Mail size={16} /> Reply via Email
                  </a>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-8 overflow-y-auto flex-1">
                <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
                  <p className="text-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.message}
                  </p>
                </div>

                {selectedComplaint.target === "platform" && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
                    <AlertCircle className="text-red-500" size={20} />
                    <div>
                      <p className="text-sm font-bold text-red-700">
                        Reported to Platform
                      </p>
                      <p className="text-xs text-red-600">
                        This complaint has been cc'd to the Super Admin.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8">
              <MessageCircle size={48} className="mb-4 opacity-20" />
              <p className="font-medium">Select a complaint to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
