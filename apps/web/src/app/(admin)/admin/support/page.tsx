"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { Loader2, Send, Plus, MessageSquare } from "lucide-react";

export default function VendorSupportPage() {
  const { storeId, storePlan } = useAdminStore();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("technical");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const q = query(
      collection(db, "stores", storeId, "tickets"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTickets(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message || !storeId) return;
    setSending(true);

    try {
      await addDoc(collection(db, "stores", storeId, "tickets"), {
        storeId,
        subject,
        message,
        category,
        status: "open",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowForm(false);
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error(error);
      alert("Failed to submit ticket.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support & Help</h1>
          <p className="text-zinc-500">
            Contact the platform team for assistance.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {showForm ? (
            "Cancel"
          ) : (
            <>
              <Plus size={18} /> New Ticket
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-50 border border-zinc-200 p-6 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-4"
        >
          <div>
            <label className="block text-sm text-zinc-500 font-bold mb-1">
              Subject
            </label>
            <input
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2 text-black outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Issue with Payouts"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-500 font-bold mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white text-black border border-zinc-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-black"
              >
                <option value="technical">Technical Issue</option>
                <option value="billing">Billing & Finance</option>
                <option value="feature_request">Feature Request</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-zinc-500 font-bold mb-1">
              Message
            </label>
            <textarea
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full bg-white text-black border border-zinc-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-black"
              placeholder="Describe your issue in detail..."
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={sending}
              type="submit"
              className="bg-black text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Submit Ticket
            </button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <MessageSquare className="mx-auto text-zinc-300 mb-4" size={48} />
            <h3 className="font-bold text-zinc-400">No tickets yet</h3>
            <p className="text-sm text-zinc-400">
              Need help? Create a new ticket above.
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-white border border-zinc-200 p-5 rounded-2xl flex items-center justify-between group hover:border-zinc-300 transition-colors"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                  <h3 className="font-bold text-black text-lg">
                    {ticket.subject}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      ticket.status === "open"
                        ? "bg-blue-100 text-blue-700"
                        : ticket.status === "resolved"
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {ticket.status}
                  </span>
                </div>
                <p className="text-sm text-zinc-500 line-clamp-2 md:line-clamp-1">
                  {ticket.message}
                </p>
                <p className="text-xs text-zinc-400 mt-2">
                  {ticket.createdAt?.toDate().toLocaleDateString()} •{" "}
                  {ticket.category}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
