"use client";

import { useState } from "react";
import { X, Send, Megaphone } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!title || !message) return;

    setSending(true);
    try {
      await addDoc(collection(db, "notifications"), {
        userId: "all",
        title,
        message,
        type: "broadcast",
        createdAt: new Date(),
        read: false, // Not strictly used for broadcast but good for schema consistency
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle("");
        setMessage("");
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error sending broadcast:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all duration-300 scale-100 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Megaphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Broadcast
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Message Title"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Message Content"
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title || !message}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              success
                ? "bg-green-500 text-white"
                : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 active:scale-[0.98]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {success ? (
              "Sent Successfully!"
            ) : sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Broadcast
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
