"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collectionGroup,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import {
  Loader2,
  Megaphone,
  Ticket,
  AlertTriangle,
  Mail,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { format } from "date-fns";

export default function SuperAdminSupportPage() {
  const [activeTab, setActiveTab] = useState<"tickets" | "complaints">(
    "tickets"
  );
  const [tickets, setTickets] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch Vendor Tickets
    const qTickets = query(
      collectionGroup(db, "tickets"),
      orderBy("createdAt", "desc")
    );
    const unsubTickets = onSnapshot(qTickets, (snapshot) => {
      setTickets(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data(), ref: d.ref }))
      );
    });

    // 2. Fetch Platform Complaints
    const qComplaints = query(
      collectionGroup(db, "complaints"),
      where("target", "==", "platform"),
      orderBy("createdAt", "desc")
    );
    const unsubComplaints = onSnapshot(qComplaints, (snapshot) => {
      setComplaints(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data(), ref: d.ref }))
      );
      setLoading(false);
    });

    return () => {
      unsubTickets();
      unsubComplaints();
    };
  }, []);

  const handleResolve = async (docRef: any) => {
    if (confirm("Mark this issue as resolved?")) {
      await updateDoc(docRef, { status: "resolved" });
    }
  };

  const TicketCard = ({ data }: { data: any }) => (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl mb-4 group hover:border-zinc-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-white">{data.subject}</span>
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                data.status === "open"
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-green-500/20 text-green-400"
              }`}
            >
              {data.status}
            </span>
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">
              Store ID: {data.storeId}
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            {data.createdAt?.toDate
              ? format(data.createdAt.toDate(), "PPpp")
              : "Just now"}{" "}
            • {data.category}
          </p>
        </div>
        {data.status === "open" && (
          <button
            onClick={() => handleResolve(data.ref)}
            className="p-2 hover:bg-green-500/20 text-zinc-400 hover:text-green-400 rounded-lg transition-colors"
            title="Mark Resolved"
          >
            <CheckCircle2 size={20} />
          </button>
        )}
      </div>
      <p className="text-zinc-300 text-sm whitespace-pre-wrap">
        {data.message}
      </p>
    </div>
  );

  const ComplaintCard = ({ data }: { data: any }) => (
    <div className="bg-zinc-900 border border-red-500/20 p-6 rounded-2xl mb-4 group hover:border-red-500/40 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-white">
              {data.subject || "No Subject"}
            </span>
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              Platform Report
            </span>
            {data.status === "resolved" && (
              <span className="bg-green-500/20 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Resolved
              </span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            From: {data.customerName} ({data.customerEmail}) • Store:{" "}
            {data.storeId}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={`mailto:${data.customerEmail}?subject=Re: ${data.subject}`}
            className="p-2 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-lg"
            title="Reply via Email"
          >
            <Mail size={20} />
          </a>
          {data.status !== "resolved" && (
            <button
              onClick={() => handleResolve(data.ref)}
              className="p-2 hover:bg-green-500/20 text-zinc-400 hover:text-green-400 rounded-lg"
              title="Mark Resolved"
            >
              <CheckCircle2 size={20} />
            </button>
          )}
        </div>
      </div>
      <p className="text-zinc-300 text-sm whitespace-pre-wrap">
        {data.message}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Support Center
        </h1>
        <p className="text-zinc-400">
          Manage vendor tickets and escalated customer complaints.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-zinc-900 rounded-xl w-fit border border-zinc-800">
        <button
          onClick={() => setActiveTab("tickets")}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "tickets"
              ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Ticket size={16} /> Vendor Tickets
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">
            {tickets.filter((t) => t.status === "open").length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("complaints")}
          className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "complaints"
              ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <AlertTriangle size={16} /> Platform Reports
          <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs">
            {complaints.filter((c) => c.status !== "resolved").length}
          </span>
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === "tickets" ? (
          tickets.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              No tickets found.
            </div>
          ) : (
            tickets.map((ticket) => (
              <TicketCard key={ticket.id} data={ticket} />
            ))
          )
        ) : complaints.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            No platform complaints found.
          </div>
        ) : (
          complaints.map((complaint) => (
            <ComplaintCard key={complaint.id} data={complaint} />
          ))
        )}
      </div>
    </div>
  );
}
