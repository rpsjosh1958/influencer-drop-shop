"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { usePaystackPayment } from "react-paystack";
import {
  Loader2,
  Save,
  Store,
  Type,
  LayoutTemplate,
  Palette,
  Image as ImageIcon,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Wallet,
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/admin/image-upload";
import { FontPicker } from "@/components/admin/font-picker";

const TABS = [
  { id: "general", label: "General", icon: Store },
  { id: "style", label: "Style", icon: Palette },
  { id: "hero", label: "Hero Section", icon: LayoutTemplate },
  { id: "footer", label: "Footer", icon: LinkIcon },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
  { id: "payouts", label: "Payout Settings", icon: Wallet },
];

export default function StoreSettingsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  // State
  const [config, setConfig] = useState<any>({
    name: "",
    status: "maintenance",
    logo: "",
    plan: "starter", // starter, growth
    isVerified: false, // false, pending, true
    theme: {
      // Style
      backgroundColor: "#ffffff",
      primaryColor: "#000000",
      fontFamily: "Inter",
      cardSize: "medium",

      // Hero
      hero: {
        enabled: true,
        layout: "center", // center, left, right
        headline: "",
        subheadline: "",
        headlineColor: "#000000",
        headlineFont: "Inter",
        subheadlineFont: "Inter",
        backgroundType: "color", // color, image
        backgroundColor: "#f4f4f5",
        backgroundImages: [], // array of strings
        overlayOpacity: 0,
      },

      // Footer
      footer: {
        enabled: true,
        text: "",
        socials: {
          instagram: "",
          twitter: "",
          tiktok: "",
        },
        contact: {
          email: "",
          address: "",
        },
      },
    },
  });

  useEffect(() => {
    if (!storeId) return;
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "stores", storeId));
        if (snap.exists()) {
          const data = snap.data();
          // Merge with defaults
          setConfig((prev: any) => ({
            ...prev,
            ...data,
            theme: {
              ...prev.theme,
              ...data.theme,
              hero: { ...prev.theme.hero, ...data.theme?.hero },
              footer: { ...prev.theme.footer, ...data.theme?.footer },
            },
          }));
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setFetching(false);
      }
    };
    fetchConfig();
  }, [storeId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId) return;
    setLoading(true);
    setSuccess("");

    try {
      await updateDoc(doc(db, "stores", storeId), config);
      setSuccess("Settings saved successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to save.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to handle nested updates
  const setNested = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const deepCopy = JSON.parse(JSON.stringify(prev));
      let current = deepCopy;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return deepCopy;
    });
  };

  // --- PAYSTACK INTEGRATION ---
  const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_KEY || "";

  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: "vendor@copdrop.io", // Idealy fetch logged in user email
    amount: 250 * 100, // GHS 250
    publicKey: PAYSTACK_KEY,
    currency: "GHS",
  };

  const onSuccess = async (reference: any) => {
    // On success, upgrade the plan
    setLoading(true);
    try {
      await updateDoc(doc(db, "stores", storeId!), {
        plan: "growth",
        isVerified: "pending", // Flag for manual review
      });
      setConfig((prev: any) => ({
        ...prev,
        plan: "growth",
        isVerified: "pending",
      }));
      setSuccess("Upgrade Successful! Welcome to Growth.");
    } catch (err) {
      console.error("Upgrade failed", err);
      alert("Payment successful but upgrade failed. Contact support.");
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    console.log("Payment closed");
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handleUpgrade = () => {
    initializePayment({ onSuccess, onClose });
  };

  // --- PAYOUTS LOGIC ---
  const [payoutState, setPayoutState] = useState({
    provider: "momo",
    bankCode: "MTN",
    accountNumber: "",
    accountName: "",
    verifiedName: "",
    isVerified: false,
    loading: false,
  });

  const MOMO_NETWORKS = [
    { name: "MTN Mobile Money", code: "MTN" },
    { name: "Vodafone Cash", code: "VOD" },
    { name: "AirtelTigo Money", code: "ATM" },
  ];

  const verifyAccount = async () => {
    setPayoutState((prev) => ({
      ...prev,
      loading: true,
      verifiedName: "",
      isVerified: false,
    }));
    try {
      const verifyFn = httpsCallable(functions, "verifyBankAccount");
      const result: any = await verifyFn({
        accountNumber: payoutState.accountNumber,
        bankCode: payoutState.bankCode,
      });
      console.log("Verify Result:", result);
      // Determine account name from result.data
      const account_name = result.data.account_name;

      setPayoutState((prev) => ({
        ...prev,
        verifiedName: account_name,
        isVerified: true,
        loading: false,
      }));
    } catch (err) {
      console.error("Verification failed", err);
      // alert("Could not verify account. Please check details.");
      setSuccess("Failed to verify. Check details.");
      setPayoutState((prev) => ({ ...prev, loading: false }));
    }
  };

  const savePayoutMethod = async () => {
    if (!payoutState.isVerified) return;
    setLoading(true);
    try {
      // 1. Create Recipient
      const createRecipientFn = httpsCallable(
        functions,
        "createTransferRecipient"
      );
      const recipient: any = await createRecipientFn({
        type: payoutState.provider === "momo" ? "mobile_money" : "nuban",
        name: payoutState.verifiedName,
        accountNumber: payoutState.accountNumber,
        bankCode: payoutState.bankCode,
      });

      console.log("Recipient Created:", recipient);
      const recipientCode = recipient.data.recipient_code;

      // 2. Save to Firestore
      const payoutConfig = {
        provider: payoutState.provider,
        bankCode: payoutState.bankCode,
        bankName:
          MOMO_NETWORKS.find((n) => n.code === payoutState.bankCode)?.name ||
          "Bank",
        accountNumber: payoutState.accountNumber,
        accountName: payoutState.verifiedName,
        recipientCode, // Critical for transfers
      };

      await updateDoc(doc(db, "stores", storeId!), {
        payoutConfig,
      });

      setSuccess("Payout Method Verified & Saved!");
      // Update local config
      setConfig((prev: any) => ({ ...prev, payoutConfig }));
      // Reset form state slightly to showing saved state logic handled in render
    } catch (err: any) {
      console.error(err);
      setSuccess("Error saving payout method: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (storeLoading || fetching)
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-zinc-500">Manage your store's brand and layout.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 flex-shrink-0 space-y-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-black text-white shadow-lg"
                  : "bg-white text-zinc-500 hover:bg-zinc-100"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            <AnimatePresence mode="wait">
              {activeTab === "general" && (
                <motion.div
                  key="general"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <h2 className="text-xl font-bold mb-6 text-zinc-900">
                    General Details
                  </h2>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => setNested(["name"], e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <ImageUpload
                      label="Store Logo"
                      value={config.logo}
                      onChange={(val) => setNested(["logo"], val)}
                      maxSizeMB={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Store Status
                    </label>
                    <select
                      value={config.status}
                      onChange={(e) => setNested(["status"], e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                    >
                      <option value="live">Live (Open)</option>
                      <option value="maintenance">Maintenance (Closed)</option>
                    </select>
                  </div>
                </motion.div>
              )}

              {activeTab === "style" && (
                <motion.div
                  key="style"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <h2 className="text-xl font-bold mb-6 text-zinc-900">
                    Global Style
                  </h2>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">
                        Background Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={config.theme.backgroundColor}
                          onChange={(e) =>
                            setNested(
                              ["theme", "backgroundColor"],
                              e.target.value
                            )
                          }
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer"
                        />
                        <code className="bg-zinc-100 px-2 py-1 rounded text-sm text-zinc-900">
                          {config.theme.backgroundColor}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">
                        Primary Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={config.theme.primaryColor}
                          onChange={(e) =>
                            setNested(["theme", "primaryColor"], e.target.value)
                          }
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer"
                        />
                        <code className="bg-zinc-100 px-2 py-1 rounded text-sm text-zinc-900">
                          {config.theme.primaryColor}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FontPicker
                      label="Primary Font Family"
                      value={config.theme.fontFamily}
                      onChange={(val) =>
                        setNested(["theme", "fontFamily"], val)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Product Card Size
                    </label>
                    <div className="flex gap-4">
                      {(["small", "medium", "large"] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setNested(["theme", "cardSize"], size)}
                          className={`flex-1 py-3 px-4 rounded-xl border text-sm font-bold capitalize ${
                            config.theme.cardSize === size
                              ? "bg-black text-white border-black"
                              : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "hero" && (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-zinc-900">
                      Hero Section
                    </h2>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-900">
                      <span className="text-sm font-medium">Enable Hero</span>
                      <input
                        type="checkbox"
                        checked={config.theme.hero.enabled}
                        onChange={(e) =>
                          setNested(
                            ["theme", "hero", "enabled"],
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-black"
                      />
                    </label>
                  </div>

                  {config.theme.hero.enabled && (
                    <>
                      <div className="space-y-4 border-b border-zinc-100 pb-6">
                        <label className="text-sm font-bold text-zinc-900">
                          Text Content
                        </label>
                        <input
                          type="text"
                          placeholder="Headline (e.g. SECURE THE BAG)"
                          value={config.theme.hero.headline}
                          onChange={(e) =>
                            setNested(
                              ["theme", "hero", "headline"],
                              e.target.value
                            )
                          }
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black uppercase tracking-tighter text-zinc-900"
                        />
                        <input
                          type="text"
                          placeholder="Subheadline (e.g. Limited drops only.)"
                          value={config.theme.hero.subheadline}
                          onChange={(e) =>
                            setNested(
                              ["theme", "hero", "subheadline"],
                              e.target.value
                            )
                          }
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                        />
                      </div>

                      <div className="space-y-4 border-b border-zinc-100 pb-6">
                        <label className="text-sm font-bold text-zinc-900">
                          Layout & Color
                        </label>
                        <div className="flex gap-4">
                          {[
                            { val: "left", icon: AlignLeft },
                            { val: "center", icon: AlignCenter },
                            { val: "right", icon: AlignRight },
                          ].map(({ val, icon: Icon }) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() =>
                                setNested(["theme", "hero", "layout"], val)
                              }
                              className={`p-3 rounded-lg border ${
                                config.theme.hero.layout === val
                                  ? "bg-black text-white border-black"
                                  : "bg-white text-zinc-400 border-zinc-200"
                              }`}
                            >
                              <Icon size={20} />
                            </button>
                          ))}
                          <div className="flex gap-2 items-center ml-auto">
                            <span className="text-xs font-bold text-zinc-500">
                              Text Color
                            </span>
                            <input
                              type="color"
                              value={config.theme.hero.headlineColor}
                              onChange={(e) =>
                                setNested(
                                  ["theme", "hero", "headlineColor"],
                                  e.target.value
                                )
                              }
                              className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <FontPicker
                            label="Headline Font"
                            value={config.theme.hero.headlineFont}
                            onChange={(val) =>
                              setNested(["theme", "hero", "headlineFont"], val)
                            }
                          />
                          <FontPicker
                            label="Subheadline Font"
                            value={config.theme.hero.subheadlineFont}
                            onChange={(val) =>
                              setNested(
                                ["theme", "hero", "subheadlineFont"],
                                val
                              )
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <ImageUpload
                          label="Background Images"
                          value={config.theme.hero.backgroundImages || []}
                          onChange={(val) =>
                            setNested(
                              ["theme", "hero", "backgroundImages"],
                              val
                            )
                          }
                          multiple={true}
                          maxSizeMB={5}
                        />
                        <div className="flex items-center gap-4">
                          <label className="text-sm font-bold flex-shrink-0 text-zinc-900">
                            Overlay Opacity: {config.theme.hero.overlayOpacity}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={config.theme.hero.overlayOpacity}
                            onChange={(e) =>
                              setNested(
                                ["theme", "hero", "overlayOpacity"],
                                parseFloat(e.target.value)
                              )
                            }
                            className="w-full accent-black"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "footer" && (
                <motion.div
                  key="footer"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-zinc-900">Footer</h2>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-900">
                      <span className="text-sm font-medium">Enable Footer</span>
                      <input
                        type="checkbox"
                        checked={config.theme.footer.enabled}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "enabled"],
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-black"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-zinc-900">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={config.theme.footer.text}
                      onChange={(e) =>
                        setNested(["theme", "footer", "text"], e.target.value)
                      }
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      placeholder="© 2025 My Store."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-zinc-100">
                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-zinc-500 uppercase">
                        Contact
                      </h3>
                      <input
                        type="email"
                        placeholder="Contact Email"
                        value={config.theme.footer.contact.email}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "contact", "email"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                      <input
                        type="text"
                        placeholder="Store Address / Location"
                        value={config.theme.footer.contact.address}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "contact", "address"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-bold text-sm text-zinc-500 uppercase">
                        Social Media
                      </h3>
                      <input
                        type="text"
                        placeholder="Instagram (@username)"
                        value={config.theme.footer.socials.instagram}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "socials", "instagram"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                      <input
                        type="text"
                        placeholder="Twitter (@username)"
                        value={config.theme.footer.socials.twitter}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "socials", "twitter"],
                            e.target.value
                          )
                        }
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === "billing" && (
                <motion.div
                  key="billing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Current Plan Card */}
                  <div className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-4 text-zinc-900 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">
                        Current Plan
                      </h2>
                      <p className="text-zinc-500">
                        Your active subscription tier.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 ${
                          config.plan === "growth"
                            ? "bg-black text-white"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {config.plan === "growth" ? (
                          <Zap size={16} fill="white" />
                        ) : null}
                        {config.plan === "growth"
                          ? "GROWTH (PRO)"
                          : "STARTER (FREE)"}
                      </div>
                    </div>
                  </div>

                  {/* GROWTH UPGRADE CARD */}
                  <div
                    className={`p-8 rounded-3xl border ${
                      config.plan === "growth"
                        ? "bg-gradient-to-br from-zinc-900 to-black text-white border-black"
                        : "bg-white border-zinc-200"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                      <div className="space-y-4 max-w-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                              config.plan === "growth"
                                ? "bg-white text-black"
                                : "bg-black text-white"
                            }`}
                          >
                            <Zap
                              size={24}
                              fill={
                                config.plan === "growth" ? "black" : "white"
                              }
                            />
                          </div>
                          <div>
                            <h3
                              className={`text-2xl font-black ${
                                config.plan === "growth"
                                  ? "text-white"
                                  : "text-zinc-900"
                              }`}
                            >
                              Growth Plan
                            </h3>
                            <p
                              className={`font-medium ${
                                config.plan === "growth"
                                  ? "text-zinc-400"
                                  : "text-zinc-500"
                              }`}
                            >
                              GH₵ 250 / month
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-black">
                          {[
                            "2% Transaction Fee (Reduced from 8%)",
                            "Verified Badge (Blue Tick)",
                            "Instant Withdrawals",
                            "Priority Support",
                          ].map((item, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2 text-sm font-medium opacity-90"
                            >
                              <CheckCircle2 size={16} /> {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {config.plan === "starter" ? (
                        <div className="w-full md:w-auto">
                          <button
                            type="button"
                            onClick={handleUpgrade}
                            disabled={loading}
                            className="w-full md:w-auto px-8 py-4 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-zinc-200"
                          >
                            Upgrade Now
                          </button>
                          <p className="text-xs text-center mt-2 text-zinc-400">
                            Secured by Paystack
                          </p>
                        </div>
                      ) : (
                        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
                          <div className="flex items-center gap-3 mb-2">
                            <ShieldCheck size={20} className="text-green-400" />
                            <span className="font-bold">Plan Active</span>
                          </div>
                          <div className="text-sm opacity-80">
                            Verification Status:{" "}
                            <strong className="capitalize">
                              {config.isVerified === true
                                ? "Verified (Blue Tick)"
                                : config.isVerified === "pending"
                                ? "Pending Review"
                                : "Unverified"}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {config.plan === "growth" && config.isVerified !== true && (
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl text-amber-900">
                      <h4 className="font-bold flex items-center gap-2 mb-2">
                        <Loader2 size={16} className="animate-spin" />{" "}
                        Verification In Progress
                      </h4>
                      <p className="text-sm">
                        We are reviewing your Ghana Card against your payout
                        details. Your Blue Tick will appear automatically once
                        approved (usually within 24 hours).
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
              {activeTab === "payouts" && (
                <motion.div
                  key="payouts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"
                >
                  <div>
                    <h2 className="text-xl font-bold text-zinc-900">
                      Payout Settings
                    </h2>
                    <p className="text-zinc-500 text-sm">
                      Where should we send your earnings?
                      <br />
                      <span className="text-xs text-zinc-400">
                        * Supported: MTN MoMo, Vodafone Cash, AirtelTigo.
                      </span>
                    </p>
                  </div>

                  {config.payoutConfig?.recipientCode ? (
                    <div className="bg-green-50 border border-green-200 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 size={18} className="text-green-600" />
                          <h3 className="font-bold text-green-900">
                            Active Payout Method
                          </h3>
                        </div>
                        <p className="text-green-800 font-mono text-lg tracking-tight">
                          {config.payoutConfig.bankName} •{" "}
                          {config.payoutConfig.accountNumber}
                        </p>
                        <p className="text-green-700 text-sm font-bold uppercase mt-1">
                          {config.payoutConfig.accountName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev: any) => ({
                            ...prev,
                            payoutConfig: null,
                          }));
                          setPayoutState({
                            provider: "momo",
                            bankCode: "MTN",
                            accountNumber: "",
                            accountName: "",
                            verifiedName: "",
                            isVerified: false,
                            loading: false,
                          });
                        }}
                        className="text-sm font-bold underline hover:text-green-900"
                      >
                        Change / Update
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 max-w-md">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-bold block mb-2">
                            Provider
                          </label>
                          <select
                            value={payoutState.provider}
                            onChange={(e) =>
                              setPayoutState((prev) => ({
                                ...prev,
                                provider: e.target.value,
                                isVerified: false,
                              }))
                            }
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                          >
                            <option value="momo">Mobile Money</option>
                            <option value="bank" disabled>
                              Bank Account (Coming Soon)
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-bold block mb-2">
                            Network
                          </label>
                          <select
                            value={payoutState.bankCode}
                            onChange={(e) =>
                              setPayoutState((prev) => ({
                                ...prev,
                                bankCode: e.target.value,
                                isVerified: false,
                              }))
                            }
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-black"
                          >
                            {MOMO_NETWORKS.map((net) => (
                              <option key={net.code} value={net.code}>
                                {net.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-bold block mb-2">
                            Mobile Number
                          </label>
                          <input
                            type="text"
                            placeholder="024xxxxxxx"
                            value={payoutState.accountNumber}
                            onChange={(e) =>
                              setPayoutState((prev) => ({
                                ...prev,
                                accountNumber: e.target.value,
                                isVerified: false,
                              }))
                            }
                            className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>
                      </div>

                      {payoutState.isVerified ? (
                        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200">
                          <p className="text-xs text-zinc-500 font-bold uppercase mb-1">
                            Verified Name
                          </p>
                          <p className="text-lg font-black text-green-600 flex items-center gap-2">
                            <CheckCircle2
                              size={24}
                              fill="currentColor"
                              className="text-white"
                            />
                            {payoutState.verifiedName}
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={verifyAccount}
                          disabled={
                            payoutState.loading ||
                            !payoutState.accountNumber ||
                            payoutState.accountNumber.length < 10
                          }
                          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-black transition-colors"
                        >
                          {payoutState.loading ? (
                            <Loader2 className="animate-spin mx-auto" />
                          ) : (
                            "Verify Account"
                          )}
                        </button>
                      )}

                      {payoutState.isVerified && (
                        <button
                          type="button"
                          onClick={savePayoutMethod}
                          disabled={loading}
                          className="w-full py-4 bg-black text-white rounded-xl font-bold shadow-xl hover:scale-105 transition-transform"
                        >
                          {loading ? (
                            <Loader2 className="animate-spin mx-auto" />
                          ) : (
                            "Save Payout Method"
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="sticky bottom-6 flex justify-end">
              <div className="bg-white/80 backdrop-blur p-2 rounded-2xl shadow-xl border border-zinc-200">
                {success && (
                  <span className="text-green-600 font-bold text-sm mr-4">
                    {success}
                  </span>
                )}
                {/* Save button only visible on tabs that are forms. Billing & Payouts handle their own save */}
                {activeTab !== "billing" && activeTab !== "payouts" && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 inline-flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Save size={18} /> Save Changes
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
