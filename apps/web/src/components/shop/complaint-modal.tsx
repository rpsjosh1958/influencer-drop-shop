"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle, Send, AlertCircle, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  user?: any;
}

export function ComplaintModal({
  isOpen,
  onClose,
  storeId,
  user,
}: ComplaintModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [target, setTarget] = useState<"store" | "platform">("store");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.displayName || "",
        email: user.email || "",
        phone: user.phoneNumber || prev.phone,
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "stores", storeId, "complaints"), {
        storeId,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        subject: formData.subject,
        message: formData.message,
        target,
        status: "unread",
        createdAt: serverTimestamp(),
        userId: user?.uid || null,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        // Reset form but keep user info if logged in
        setFormData((prev) => ({
          name: user?.displayName || "",
          email: user?.email || "",
          phone: user?.phoneNumber || "",
          subject: "",
          message: "",
        }));
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting complaint:", error);
      alert("Failed to submit complaint. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isLoggedIn = !!user;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">
                    Submit Complaint
                  </h2>
                  <p className="text-xs text-zinc-500 font-medium">
                    We're here to help resolve your issue
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center hover:bg-zinc-50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {success ? (
                <div className="py-12 flex flex-col items-center text-center">
                  <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                    <Send size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 mb-2">
                    Complaint Sent
                  </h3>
                  <p className="text-zinc-500 max-w-xs">
                    We've received your message and will get back to you shortly
                    via email.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Target Selector */}
                  <div className="bg-zinc-50 p-1 rounded-xl flex">
                    <button
                      type="button"
                      onClick={() => setTarget("store")}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                        target === "store"
                          ? "bg-white shadow text-black"
                          : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      Send to Store
                    </button>
                    <button
                      type="button"
                      onClick={() => setTarget("platform")}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
                        target === "platform"
                          ? "bg-white shadow text-red-600"
                          : "text-zinc-400 hover:text-zinc-600"
                      }`}
                    >
                      Report to Platform
                    </button>
                  </div>

                  {/* Contact Info Switcher */}
                  {isLoggedIn ? (
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500">
                          <User size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">
                              {formData.name}
                            </span>
                            <span className="text-[10px] bg-black text-white px-1.5 py-0.5 rounded-full font-bold uppercase">
                              Logged In
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formData.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-zinc-400">
                            Full Name
                          </label>
                          <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors font-medium"
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold uppercase text-zinc-400">
                            Email Address
                          </label>
                          <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors font-medium"
                            placeholder="john@example.com"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-zinc-400">
                      Phone Number
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors font-medium"
                      placeholder="+233..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-zinc-400">
                      Subject
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors font-medium"
                      placeholder="e.g. Order #1234 Issue"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-zinc-400">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-black transition-colors font-medium resize-none"
                      placeholder="Describe your issue in detail..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white h-12 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} /> Submit Complaint
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
