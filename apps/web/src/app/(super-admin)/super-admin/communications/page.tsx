"use client";

import { useState } from "react";
import { Send, Users, Megaphone } from "lucide-react";
import { auth } from "@/lib/firebase";
import { getErrorMessage } from "@/lib/errors";

export default function CommunicationsPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "starter" | "growth">("all");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject || !message) return;
    if (!auth.currentUser) return;

    setSending(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ subject, message, target }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      alert(
        data.count > 0
          ? `Broadcast sent to ${data.count} of ${data.recipients} vendor(s).`
          : `No vendors matched "${target}" — nothing was sent.`
      );
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Broadcast failed", error);
      alert(`Failed to send broadcast: ${getErrorMessage(error)}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Communications
        </h1>
        <p className="text-zinc-400">Send broadcasts to platform users.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-zinc-300 mb-2">
            Target Audience
          </label>
          <div className="flex gap-2">
            {(["all", "starter", "growth"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                  target === t
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-zinc-300 mb-2">
            Subject Line
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
            placeholder="Important Update: Platform Maintenance"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-zinc-300 mb-2">
            Message Content
          </label>
          <textarea
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all resize-none"
            placeholder="Write your message here..."
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !subject || !message}
          className="w-full py-4 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send size={20} />
              Send Broadcast
            </>
          )}
        </button>
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 flex gap-4 text-sm text-zinc-500">
        <div className="p-2 bg-zinc-800 rounded-lg h-fit">
          <Megaphone className="w-4 h-4" />
        </div>
        <p>
          Broadcasts are sent via email using Resend. Ensure your API keys are
          configured in the environment variables. Messages are also logged to
          the system activity log.
        </p>
      </div>
    </div>
  );
}
