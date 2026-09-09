"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  collection,
  query,
  orderBy,
  getDocs,
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
  Loader2,
} from "lucide-react";
import { Complaint } from "@/types";
import { HelpTrigger } from "@/context/onboarding-context";
import { toJsDate } from "@/lib/utils";
import { EmptyState } from "@/components/admin/empty-state";

export default function AdminComplaintsPage() {
  const { storeId } = useAdminStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "resolved">("all");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(
    null,
  );

  const { data: complaints = [], isLoading: loading } = useQuery({
    queryKey: ["complaints", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const q = query(
        collection(db, "stores", storeId, "complaints"),
        orderBy("createdAt", "desc"),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Complaint[];
    },
    enabled: !!storeId,
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: Complaint["status"];
    }) => {
      if (!storeId) return;
      await updateDoc(doc(db, "stores", storeId, "complaints", id), {
        status: newStatus,
      });
    },
    onSuccess: (_, { id, newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["complaints", storeId] });
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) =>
          prev ? { ...prev, status: newStatus } : null,
        );
      }
    },
    onError: (error) => {
      console.error("Error updating status:", error);
    },
  });

  const handleStatusUpdate = (id: string, newStatus: Complaint["status"]) => {
    if (!storeId) return;
    statusMutation.mutate({ id, newStatus });
  };

  const filteredComplaints = complaints.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-2">
            Complaints & Support
            <HelpTrigger category="complaints" />
          </h1>
          <p className="text-zinc-500">
            Manage customer inquiries and resolve issues.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[calc(100vh-200px)]">
        {/* List Column */}
        <div
          data-tour="complaints-list"
          className="lg:col-span-1 bg-white rounded-2xl border border-zinc-200 flex flex-col overflow-hidden shadow-sm h-[500px] lg:h-auto"
        >
          {/* Filters */}
          <div
            data-tour="complaints-filters"
            className="p-4 border-b border-zinc-100 flex gap-2"
          >
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
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-zinc-400" size={24} />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No complaints found"
                description="Customer inquiries will show up here."
              />
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
                      {toJsDate(complaint.createdAt)
                        ? format(toJsDate(complaint.createdAt)!, "MMM d")
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
        <div
          data-tour="complaints-detail"
          className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm flex flex-col h-[600px] lg:h-auto"
        >
          {selectedComplaint ? (
            <>
              {/* Detail Header */}
              <div className="p-8 border-b border-zinc-100 flex flex-col md:flex-row justify-between items-start gap-6 bg-zinc-50/50">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
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
                  <div className="flex flex-wrap items-center gap-2 text-zinc-500 text-sm font-medium">
                    <UserIcon /> {selectedComplaint.customerName} &bull;{" "}
                    {selectedComplaint.customerEmail} &bull;{" "}
                    {selectedComplaint.customerPhone}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <button
                    onClick={() =>
                      handleStatusUpdate(selectedComplaint.id, "resolved")
                    }
                    className="h-11 px-6 bg-white border border-zinc-200 rounded-xl text-black text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Mark Resolved
                  </button>
                  <a
                    href={`mailto:${selectedComplaint.customerEmail}?subject=Re: ${selectedComplaint.subject} [Ticket: ${selectedComplaint.id}]`}
                    className="h-11 px-6 bg-black border border-zinc-200 rounded-xl text-white text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail size={18} /> Reply via Email
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
