"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, CheckCircle, Clock } from "lucide-react";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  fromEmail: string;
  status: "open" | "closed";
  createdAt: any;
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const q = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Ticket[];
      setTickets(data);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "closed" : "open";
    try {
      await updateDoc(doc(db, "tickets", id), { status: newStatus });
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      );
    } catch (error) {
      console.error("Status update failed", error);
    }
  };

  if (loading) return <div>Loading tickets...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Support Tickets
        </h1>
        <p className="text-zinc-400">
          Manage inquiries from users and vendors.
        </p>
      </div>

      <div className="grid gap-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    ticket.status === "open"
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-green-500/10 text-green-500"
                  }`}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white">{ticket.subject}</h3>
                  <p className="text-xs text-zinc-500">
                    {ticket.fromEmail} •{" "}
                    {new Date(ticket.createdAt?.toDate()).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleStatus(ticket.id, ticket.status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  ticket.status === "closed"
                    ? "border-green-500/20 text-green-500 bg-green-500/5 hover:bg-green-500/10"
                    : "border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500"
                }`}
              >
                {ticket.status === "closed" ? "Re-open" : "Mark Resolved"}
              </button>
            </div>

            <p className="text-zinc-300 text-sm leading-relaxed pl-12 border-l-2 border-zinc-800 ml-4">
              {ticket.message}
            </p>
          </div>
        ))}

        {tickets.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No tickets found. Good job!
          </div>
        )}
      </div>
    </div>
  );
}
