"use client";

import { useState, useEffect, useRef } from "react";
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
  MoreVertical,
  Edit2,
  Star,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import {
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  doc,
  getDoc,
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

import { Country, City } from "country-state-city";
import { Combobox } from "@/components/ui/combobox";

// Helper to get formatted options
const countryOptions = Country.getAllCountries().map((country) => ({
  label: country.name,
  value: country.isoCode,
}));

// Helper to get city options for a country
const getCityOptions = (countryCode: string) => {
  if (!countryCode) return [];
  return (
    City.getCitiesOfCountry(countryCode)?.map((city) => ({
      label: city.name,
      value: city.name, // Using name as value since we store city names, not IDs
    })) || []
  );
};

export function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useBodyScrollLock(isOpen);

  // Personal Info State
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState("");

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<Partial<Address>>({
    country: "Ghana",
    city: "Accra",
    zip: "",
    street: "",
  });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Security State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Refs for click outside
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    setError("");
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
      setError("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const activeAddressFormTitle = editingAddressId
    ? "Edit Address"
    : "Add Address";
  const activeAddressFormButton = editingAddressId
    ? "Update Address"
    : "Save Address";

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      let updatedAddresses = [...addresses];

      if (editingAddressId) {
        // Edit existing address
        updatedAddresses = addresses.map((addr) =>
          addr.id === editingAddressId
            ? { ...addr, ...newAddress } // Update only changed fields
            : addr
        ) as Address[];
      } else {
        // Add new address
        const addressToAdd: Address = {
          id: Date.now().toString(),
          country: newAddress.country || "Ghana",
          city: newAddress.city || "Accra",
          zip: newAddress.zip || "",
          street: newAddress.street || "",
          isDefault: addresses.length === 0, // First address is default
        };
        updatedAddresses.push(addressToAdd);
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: updatedAddresses,
        },
        { merge: true }
      );

      setAddresses(updatedAddresses);
      setAddingAddress(false);
      setEditingAddressId(null);
      setNewAddress({ country: "Ghana", city: "Accra", zip: "", street: "" });
    } catch (err) {
      console.error(err);
      setError("Failed to save address");
    } finally {
      setLoading(false);
    }
  };

  const handleEditAddress = (addr: Address) => {
    setNewAddress({
      country: addr.country,
      city: addr.city,
      zip: addr.zip,
      street: addr.street,
    });
    setEditingAddressId(addr.id);
    setAddingAddress(true);
    setActiveMenuId(null);
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    setLoading(true);
    try {
      const updatedAddresses = addresses.map((addr) => ({
        ...addr,
        isDefault: addr.id === addrId,
      }));

      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: updatedAddresses,
        },
        { merge: true }
      );
      setAddresses(updatedAddresses);
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
      setError("Failed to set default address");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAddress = async (addr: Address) => {
    if (!confirm("Are you sure you want to remove this address?")) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          addresses: arrayRemove(addr),
        },
        { merge: true }
      );
      setAddresses(addresses.filter((a) => a.id !== addr.id));
      setActiveMenuId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    if (!auth.currentUser || !auth.currentUser.email) return;

    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        oldPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // If successful, update password
      await updatePassword(auth.currentUser, newPassword);
      setMessage("Password changed successfully.");
      setNewPassword("");
      setOldPassword("");
    } catch (err: any) {
      console.error(err);
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError(
          "The current password you entered is incorrect. Please try again."
        );
      } else if (err.code === "auth/requires-recent-login") {
        setError("Please log out and log in again to change password.");
      } else {
        setError("Failed to change password: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelAddressEdit = () => {
    setAddingAddress(false);
    setEditingAddressId(null);
    setNewAddress({ country: "Ghana", city: "Accra", zip: "", street: "" });
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
                  <h2 className="text-2xl font-black tracking-tight text-black">
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
                  {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-xl text-sm font-medium flex items-center gap-2">
                      <X size={16} /> {error}
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
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
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
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
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
                                className={`p-4 border rounded-xl flex justify-between items-start group relative transition-all ${
                                  addr.isDefault
                                    ? "border-black bg-zinc-50"
                                    : "border-zinc-200 hover:border-zinc-300"
                                }`}
                              >
                                <div>
                                  <div className="font-bold flex items-center gap-2 text-black">
                                    {addr.city},{" "}
                                    {countryOptions.find(
                                      (c) => c.value === addr.country
                                    )?.label || addr.country}
                                    {addr.isDefault && (
                                      <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
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
                                <div className="relative">
                                  <button
                                    onClick={() =>
                                      setActiveMenuId(
                                        activeMenuId === addr.id
                                          ? null
                                          : addr.id
                                      )
                                    }
                                    className="text-zinc-400 hover:text-black p-1 rounded-full hover:bg-zinc-200 transition-colors"
                                  >
                                    <MoreVertical size={16} />
                                  </button>

                                  {activeMenuId === addr.id && (
                                    <div
                                      ref={menuRef}
                                      className="absolute right-0 top-8 bg-white shadow-xl rounded-xl border border-zinc-100 w-36 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                      <button
                                        onClick={() => handleEditAddress(addr)}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center gap-2 font-medium"
                                      >
                                        <Edit2 size={14} /> Edit
                                      </button>
                                      {!addr.isDefault && (
                                        <button
                                          onClick={() =>
                                            handleSetDefaultAddress(addr.id)
                                          }
                                          className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50 flex items-center gap-2 font-medium"
                                        >
                                          <Star size={14} /> Default
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          handleRemoveAddress(addr)
                                        }
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2 font-medium border-t border-zinc-50"
                                      >
                                        <Trash2 size={14} /> Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
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
                          onSubmit={handleSaveAddress}
                          className="space-y-4 animate-in fade-in slide-in-from-bottom-4"
                        >
                          <h3 className="font-bold mb-4">
                            {activeAddressFormTitle}
                          </h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                                Country
                              </label>
                              <Combobox
                                options={countryOptions}
                                value={newAddress.country}
                                onChange={(val) =>
                                  setNewAddress({
                                    ...newAddress,
                                    country: val,
                                    city: "", // Reset city when country changes
                                  })
                                }
                                placeholder="Select Country"
                                searchPlaceholder="Search country..."
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1">
                                City
                              </label>
                              <Combobox
                                options={getCityOptions(
                                  newAddress.country || ""
                                )}
                                value={newAddress.city}
                                onChange={(val) =>
                                  setNewAddress({
                                    ...newAddress,
                                    city: val,
                                  })
                                }
                                placeholder="Select City"
                                searchPlaceholder="Search city..."
                                disabled={!newAddress.country}
                              />
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
                              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
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
                              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                              placeholder="GA-123-456..."
                            />
                          </div>
                          <div className="flex gap-3 pt-4">
                            <button
                              type="button"
                              onClick={cancelAddressEdit}
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
                                activeAddressFormButton
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
                            Current Password
                          </label>
                          <input
                            type="password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
                            placeholder="••••••••"
                          />
                        </div>
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
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none text-black"
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
