"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  MapPin,
  Lock,
  Plus,
  Trash2,
  Check,
  Loader2,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { updateProfile, updatePassword, updateEmail } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

interface Address {
  id: string;
  country: string;
  city: string;
  zip: string;
  street: string;
  isDefault: boolean;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

const COUNTRIES = ["Ghana", "Nigeria", "United States", "United Kingdom"];
const CITIES: Record<string, string[]> = {
  Ghana: ["Accra", "Kumasi", "Tamale", "Takoradi"],
  Nigeria: ["Lagos", "Abuja", "Port Harcourt"],
  "United States": ["New York", "Los Angeles", "Chicago"],
  "United Kingdom": ["London", "Manchester", "Birmingham"],
};

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useBodyScrollLock(isOpen);

  // Personal Info State
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    country: "Ghana",
    city: "Accra",
    zip: "",
    street: "",
  });

  // Security State
  const [newPassword, setNewPassword] = useState("");

  // Fetch User Data
  useEffect(() => {
    if (user && isOpen) {
      setName(user.displayName || "");
      const fetchProfile = async () => {
        try {
          const docRef = doc(db, "users", user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setPhone(data.phone || "");
            setAddresses(data.addresses || []);
          }
        } catch (e) {
          console.error("Failed to load profile", e);
        }
      };
      fetchProfile();
    }
  }, [user, isOpen]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: name });
        // Update Firestore too (use setDoc with merge to create if missing)
        await setDoc(
          doc(db, "users", user.uid),
          {
            phone,
            displayName: name,
          },
          { merge: true }
        );
        setMessage("Profile updated successfully.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const addressToAdd: Address = {
        id: Date.now().toString(),
        country: newAddress.country || "Ghana",
        city: newAddress.city || "Accra",
        zip: newAddress.zip || "",
        street: newAddress.street || "",
        isDefault: addresses.length === 0, // First address is default
      };

      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: arrayUnion(addressToAdd),
        },
        { merge: true }
      );

      setAddresses([...addresses, addressToAdd]);
      setAddingAddress(false);
      setNewAddress({ country: "Ghana", city: "Accra", zip: "", street: "" });
    } catch (err) {
      console.error(err);
      setMessage("Failed to add address");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAddress = async (addr: Address) => {
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: arrayRemove(addr),
        },
        { merge: true }
      );
      setAddresses(addresses.filter((a) => a.id !== addr.id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setMessage("Password changed successfully.");
        setNewPassword("");
      }
    } catch (err: any) {
      if (err.code === "auth/requires-recent-login") {
        setMessage("Please log out and log in again to change password.");
      } else {
        setMessage("Failed to change password: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none"
          >
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden pointer-events-auto flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    PROFILE SETTINGS
                  </h2>
                  <p className="text-zinc-500 text-sm">
                    Manage your account and preferences.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-full md:w-1/3 bg-zinc-50 border-b md:border-b-0 md:border-r border-zinc-100 p-4 flex md:flex-col gap-2 overflow-x-auto flex-shrink-0">
                  <button
                    onClick={() => setActiveTab("personal")}
                    className={`flex-shrink-0 w-auto md:w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold text-sm transition-all ${
                      activeTab === "personal"
                        ? "bg-black text-white"
                        : "hover:bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    <User size={18} />{" "}
                    <span className="hidden md:inline">Personal Info</span>
                    <span className="md:hidden">Profile</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("addresses")}
                    className={`flex-shrink-0 w-auto md:w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold text-sm transition-all ${
                      activeTab === "addresses"
                        ? "bg-black text-white"
                        : "hover:bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    <MapPin size={18} /> Addresses
                  </button>
                  <button
                    onClick={() => setActiveTab("security")}
                    className={`flex-shrink-0 w-auto md:w-full text-left p-3 rounded-xl flex items-center gap-3 font-bold text-sm transition-all ${
                      activeTab === "security"
                        ? "bg-black text-white"
                        : "hover:bg-zinc-200 text-zinc-500"
                    }`}
                  >
                    <Lock size={18} /> Security
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto w-full">
                  {message && (
                    <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-xl text-sm font-medium flex items-center gap-2">
                      <Check size={16} /> {message}
                    </div>
                  )}

                  {activeTab === "personal" && (
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                            Email (Cannot be changed)
                          </label>
                          <input
                            disabled
                            value={user?.email || ""}
                            className="w-full p-3 bg-zinc-100 rounded-xl border-none text-zinc-500 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                            Full Name
                          </label>
                          <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                            placeholder="Your Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                            Phone
                          </label>
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                            placeholder="054..."
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        {loading && (
                          <Loader2 className="animate-spin" size={16} />
                        )}{" "}
                        Save Changes
                      </button>
                    </form>
                  )}

                  {activeTab === "addresses" && (
                    <div className="space-y-6">
                      {!addingAddress ? (
                        <>
                          <div className="space-y-4">
                            {addresses.length === 0 && (
                              <p className="text-zinc-500 text-sm">
                                No addresses saved.
                              </p>
                            )}
                            {addresses.map((addr) => (
                              <div
                                key={addr.id}
                                className="p-4 border border-zinc-200 rounded-xl flex justify-between items-start group"
                              >
                                <div>
                                  <div className="font-bold flex items-center gap-2">
                                    {addr.city}, {addr.country}
                                    {addr.isDefault && (
                                      <span className="bg-zinc-100 text-xs px-2 py-0.5 rounded text-zinc-500">
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-zinc-500 mt-1">
                                    {addr.street}
                                  </div>
                                  <div className="text-xs text-zinc-400">
                                    {addr.zip}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemoveAddress(addr)}
                                  className="text-zinc-300 hover:text-red-500"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setAddingAddress(true)}
                            className="w-full py-4 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center gap-2 text-zinc-500 font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                          >
                            <Plus size={20} /> Add New Address
                          </button>
                        </>
                      ) : (
                        <form
                          onSubmit={handleAddAddress}
                          className="space-y-4 animate-in fade-in slide-in-from-bottom-4"
                        >
                          <h3 className="font-bold mb-4">Add Address</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                                Country
                              </label>
                              <select
                                value={newAddress.country}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    country: e.target.value,
                                    city: CITIES[e.target.value]?.[0] || "",
                                  })
                                }
                                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                              >
                                {COUNTRIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                                City
                              </label>
                              <select
                                value={newAddress.city}
                                onChange={(e) =>
                                  setNewAddress({
                                    ...newAddress,
                                    city: e.target.value,
                                  })
                                }
                                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                              >
                                {CITIES[newAddress.country || "Ghana"]?.map(
                                  (c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  )
                                )}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                              Street Address
                            </label>
                            <input
                              value={newAddress.street}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  street: e.target.value,
                                })
                              }
                              required
                              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                              placeholder="Apartment, Street..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                              Zip / Digital Address (Optional)
                            </label>
                            <input
                              value={newAddress.zip}
                              onChange={(e) =>
                                setNewAddress({
                                  ...newAddress,
                                  zip: e.target.value,
                                })
                              }
                              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                              placeholder="GA-123-456..."
                            />
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={() => setAddingAddress(false)}
                              className="flex-1 px-6 py-3 bg-zinc-100 rounded-xl font-bold hover:bg-zinc-200"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-900"
                            >
                              {loading ? (
                                <Loader2 className="animate-spin inline" />
                              ) : (
                                "Save Address"
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {activeTab === "security" && (
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-105 transition-transform flex items-center gap-2"
                      >
                        {loading && (
                          <Loader2 className="animate-spin" size={16} />
                        )}{" "}
                        Update Password
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
