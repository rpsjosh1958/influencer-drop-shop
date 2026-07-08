"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase"; // Added auth
import { useAdminStore } from "@/components/admin/admin-store-provider";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
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
  BadgeCheck,
  UserCog,
  Lock,
  AlertCircle,
} from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUpload } from "@/components/admin/image-upload";
import { FontPicker } from "@/components/admin/font-picker";
import { PasswordInput } from "@/components/ui/password-input";
import { HelpTrigger, useOnboarding } from "@/context/onboarding-context";
import { formatCurrency } from "@/lib/utils";

const TABS = [
  { id: "general", label: "General", icon: Store },
  { id: "profile", label: "Profile & Security", icon: UserCog },
  { id: "style", label: "Style", icon: Palette },
  { id: "hero", label: "Hero Section", icon: LayoutTemplate },
  { id: "footer", label: "Footer", icon: LinkIcon },
  { id: "billing", label: "Billing & Plan", icon: CreditCard },
  { id: "payouts", label: "Payout Settings", icon: Wallet },
];

function SetupRequired({ 
  title, 
  description, 
  onAction 
}: { 
  title: string; 
  description: string; 
  onAction: () => void 
}) {
  return (
    <div className="bg-white p-12 rounded-[2.5rem] border border-zinc-200 text-center space-y-6">
      <div className="h-20 w-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto">
        <AlertCircle size={32} className="text-zinc-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900">{title}</h2>
        <p className="text-zinc-500 max-w-sm mx-auto">{description}</p>
      </div>
      <button 
        onClick={onAction}
        className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
      >
        Select Store Type
      </button>
    </div>
  );
}

export default function StoreSettingsPage() {
  const { 
    storeId, 
    storeName, 
    userPlan, 
    planExpiresAt, 
    loading: storeLoading,
    onboardingStatus,
    onboardingNotes
  } = useAdminStore();
  const { currentStepTarget, isActive: isTourActive } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  // Sync tab with tutorial progress
  useEffect(() => {
    if (!isTourActive) return;
    if (currentStepTarget === "settings-billing") {
      setActiveTab("billing");
    } else if (currentStepTarget === "settings-payouts") {
      setActiveTab("payouts");
    }
  }, [currentStepTarget, isTourActive]);

  const [billingCycle, setBillingCycle] = useState<
    "monthly" | "quarterly" | "annual"
  >("monthly");

  const BILLING_PLANS = {
    monthly: { label: "Monthly", price: 250, days: 30 },
    quarterly: { label: "Quarterly (3 Months)", price: 700, days: 90 }, // Discounted from 750
    annual: { label: "Annual (12 Months)", price: 2500, days: 365 }, // Discounted from 3000
  };

  // State
  const [config, setConfig] = useState<any>({
    name: "",
    type: "", // Added to track selection
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

  const isFreePlan = userPlan === "starter";
  const isTypeSelected = !!config.type;

  const getDaysLeft = () => {
    let expiryDate: Date | null = null;

    if (planExpiresAt) {
      expiryDate = planExpiresAt.toDate 
        ? planExpiresAt.toDate() 
        : new Date(planExpiresAt.seconds * 1000);
    } else if (config.plan === "growth" && config.createdAt) {
      // Fallback: 30 days from creation if growth plan but no expiry set
      const created = config.createdAt.toDate 
        ? config.createdAt.toDate() 
        : new Date(config.createdAt.seconds * 1000);
      expiryDate = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    if (!expiryDate) return null;

    const now = new Date();
    const diff = expiryDate.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return {
      days: days > 0 ? days : 0,
      date: expiryDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  };

  const expiryInfo = getDaysLeft();

  const [userData, setUserData] = useState<any>(null);

  // Fetch Vendor Data (User Profile)
  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchUser = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", auth.currentUser!.uid));
        if (userSnap.exists()) {
          setUserData(userSnap.data());
        }
      } catch (e) {
        console.error("Failed to fetch user data", e);
      }
    };
    fetchUser();
  }, []);

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

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!storeId) return;
    setLoading(true);
    setSuccess("");

    try {
      const payload = { ...config };

      // Strip restricted properties to avoid Firestore Rules Access Denied errors
      delete payload.isVerified;
      delete payload.isSuspended;
      delete payload.ownerId;
      delete payload.plan; // Plan upgrades are handled elsewhere
      delete payload.onboardingNotes;
      delete payload.onboardingReviewerId;
      delete payload.onboardingUpdatedAt;
      delete payload.createdAt;
      delete payload.planExpiresAt;
      delete payload.planChangedAt;

      // Reset onboarding status if saving after requested info
      if (onboardingStatus === "needs_more_info") {
        payload.onboardingStatus = "pending";
      } else {
        delete payload.onboardingStatus;
      }

      // Synchronize `features` object with the selected `type`
      const type = payload.type || "product";
      payload.features = {
        hasProducts: type === "product" || type === "hybrid",
        hasServices: type === "service" || type === "hybrid",
        hasPreorders: type === "hybrid",
      };

      // Enforce Hero Defaults for Free Plan
      if (isFreePlan) {
        if (!payload.theme.hero) payload.theme.hero = {};
        payload.theme.hero.headline = `Welcome to ${config.name}`;
        payload.theme.hero.subheadline = "Browse our latest collection.";
        payload.theme.hero.enabled = true; // Ensure it's enabled
      }


      await updateDoc(doc(db, "stores", storeId), payload);
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
    amount: BILLING_PLANS[billingCycle].price * 100, // Dynamic Amount
    publicKey: PAYSTACK_KEY,
    currency: "GHS",
  };

  const onSuccess = async (reference: any) => {
    // On success, upgrade the account-level plan
    const planDetails = BILLING_PLANS[billingCycle];
    setLoading(true);
    try {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(now.getDate() + planDetails.days);

      // CRITICAL: Update the USER document (Centralized Subscription)
      await updateDoc(doc(db, "users", auth.currentUser!.uid), {
        plan: "growth",
        isTrial: false,
        planStartedAt: now,
        planExpiresAt: expiresAt,
        billingCycle: billingCycle,
      });

      // Also update current store immediately for UI feedback 
      // (The sync trigger will eventually update all others)
      await updateDoc(doc(db, "stores", storeId!), {
        plan: "growth",
        isVerified: onboardingStatus === "approved",
        planExpiresAt: expiresAt,
      });

      setSuccess("Upgrade Successful! Your entire account is now on the Growth Plan.");
    } catch (err) {
      console.error("Upgrade failed", err);
      alert("Payment successful but upgrade failed. Contact support.");
    } finally {
      setLoading(false);
    }
  };

  const onClose = () => {
    //
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
    { name: "Telecel", code: "VOD" },
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
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Store Settings
          <HelpTrigger 
            category={activeTab === "billing" || activeTab === "payouts" ? "settings-pro" : "settings"} 
            target={activeTab === "billing" ? "settings-billing" : activeTab === "payouts" ? "settings-payouts" : undefined}
          />
        </h1>
        <p className="text-zinc-500">Manage your store's brand and layout.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div 
          data-tour="settings-tabs"
          className="w-full lg:w-64 flex-shrink-0 space-y-2"
        >
          {TABS.map((tab) => {
            const isLocked = (tab.id === "billing" || tab.id === "payouts") && !isTypeSelected;
            return (
              <button
                key={tab.id}
                onClick={() => !isLocked && setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-black text-white shadow-lg"
                    : isLocked 
                      ? "bg-zinc-50 text-zinc-300 cursor-not-allowed"
                      : "bg-white text-zinc-500 hover:bg-zinc-100"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {isLocked && <Lock size={14} className="ml-auto" />}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <div className="space-y-6">
            {onboardingStatus === "needs_more_info" && (
              <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl space-y-3">
                <div className="flex items-center gap-3 text-amber-800">
                  <AlertCircle size={24} />
                  <h3 className="font-bold text-lg">Action Required for Approval</h3>
                </div>
                <div className="bg-white/50 p-4 rounded-2xl border border-amber-200/50 text-amber-900 text-sm italic">
                  &quot;{onboardingNotes || "Please review your store details and documents."}&quot;
                </div>
                <p className="text-sm text-amber-700 font-medium">
                  Please update the requested information below and save your changes. Our team will automatically re-review your store.
                </p>
              </div>
            )}

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

                  {/* Store Type Section */}
                  <div 
                    data-tour="settings-type"
                    className="space-y-2 pt-6 border-t border-zinc-100"
                  >
                    <label className="text-sm font-bold text-zinc-900">
                      Store Type
                    </label>
                    <p className="text-xs text-zinc-500 mb-3">
                      This determines what features are available in your admin
                      portal.
                    </p>
                    <select
                      value={config.type || ""}
                      onChange={(e) => {
                        const newType = e.target.value as
                          | "product"
                          | "service"
                          | "hybrid";
                        if (!newType) return;
                        const newFeatures = {
                          hasProducts:
                            newType === "product" || newType === "hybrid",
                          hasServices:
                            newType === "service" || newType === "hybrid",
                          hasPreorders: newType === "hybrid",
                        };
                        setNested(["type"], newType);
                        setNested(["features"], newFeatures);
                      }}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900"
                    >
                      <option value="" disabled>
                        Select Store Type
                      </option>
                      <option value="product">
                        Products Only (Physical goods)
                      </option>
                      <option value="service">
                        Services Only (Appointments/Bookings)
                      </option>
                      <option value="hybrid">Both (Products + Services)</option>
                    </select>

                    {config.features && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {config.features.hasProducts && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            Products ✓
                          </span>
                        )}
                        {config.features.hasServices && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                            Services ✓
                          </span>
                        )}
                        {config.features.hasPreorders && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full">
                            Pre-orders ✓
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-white p-8 rounded-3xl border border-zinc-200">
                    <h2 className="text-xl font-bold mb-6 text-zinc-900">
                      {userData?.vendorType === "company"
                        ? "Company Profile"
                        : "Vendor Profile"}
                    </h2>

                    {userData?.vendorType === "company" ? (
                      /* COMPANY VIEW */
                      <div className="space-y-8">
                        {/* Company Details */}
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
                            Company Details
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Company Name
                              </label>
                              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                                {userData?.fullName || "N/A"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Phone Number
                              </label>
                              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                                {userData?.phone || "N/A"}
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Verification Document
                              </label>
                              <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 flex items-center justify-between">
                                <span className="text-sm font-medium text-zinc-600">
                                  Registration Certificate
                                </span>
                                {userData?.identity?.companyDoc ? (
                                  <a
                                    href={userData.identity.companyDoc}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-bold text-black underline flex items-center gap-1 hover:text-blue-600"
                                  >
                                    View Document <LinkIcon size={12} />
                                  </a>
                                ) : (
                                  <span className="text-xs text-zinc-400 italic">
                                    No document uploaded
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="w-full h-px bg-zinc-100" />

                        {/* Contact Person */}
                        <div>
                          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-4">
                            Contact Person
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Name
                              </label>
                              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                                {userData?.contactPerson?.name || "N/A"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Position
                              </label>
                              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                                {userData?.contactPerson?.position || "N/A"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Work Email
                              </label>
                              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                                {userData?.contactPerson?.email || "N/A"}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-zinc-500 uppercase">
                                Direct Phone
                              </label>
                              <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                                {userData?.contactPerson?.phone || "N/A"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* INDIVIDUAL VIEW */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500 uppercase">
                            Full Name
                          </label>
                          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                            {userData?.fullName ||
                              auth.currentUser?.displayName ||
                              "Vendor"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500 uppercase">
                            Email Address
                          </label>
                          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                            {userData?.email || auth.currentUser?.email}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500 uppercase">
                            Phone Number
                          </label>
                          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200">
                            {userData?.phone || "N/A"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-zinc-500 uppercase">
                            Ghana Card (NIA)
                          </label>
                          <div className="p-3 bg-zinc-100 rounded-lg text-zinc-600 font-medium cursor-not-allowed border border-zinc-200 flex items-center gap-2">
                            <ShieldCheck size={16} className="text-zinc-400" />
                            {userData?.identity?.ghanaCard || "***************"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-zinc-200">
                    <h2 className="text-xl font-bold mb-6 text-zinc-900">
                      Security
                    </h2>
                    <ChangePasswordForm />
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

                  {isFreePlan && (
                    <div className="mb-6 bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-200 rounded-full flex items-center justify-center">
                          <Zap size={18} className="text-zinc-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">
                            Customization Locked
                          </p>
                          <p className="text-xs text-zinc-500">
                            Upgrade to Growth to change colors & fonts.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("billing")}
                        className="text-xs font-bold bg-black text-white px-3 py-2 rounded-lg"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}

                  <div className={`space-y-6 ${isFreePlan ? "opacity-50 pointer-events-none select-none" : ""}`}>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-900">
                        Background Color
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          disabled={isFreePlan}
                          value={config.theme.backgroundColor}
                          onChange={(e) =>
                            setNested(
                              ["theme", "backgroundColor"],
                              e.target.value
                            )
                          }
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                          disabled={isFreePlan}
                          value={config.theme.primaryColor}
                          onChange={(e) =>
                            setNested(["theme", "primaryColor"], e.target.value)
                          }
                          className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-zinc-900">
                      Hero Section
                    </h2>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-900">
                      <span className="text-sm font-medium">Enable Hero</span>
                      <input
                        type="checkbox"
                        disabled={isFreePlan}
                        checked={config.theme.hero.enabled}
                        onChange={(e) =>
                          setNested(
                            ["theme", "hero", "enabled"],
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-black disabled:opacity-50"
                      />
                    </label>
                  </div>
                  {isFreePlan && (
                    <div className="mb-6 bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-200 rounded-full flex items-center justify-center">
                          <LayoutTemplate size={18} className="text-zinc-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Hero Section Locked</p>
                          <p className="text-xs text-zinc-500">
                            Upgrade to Growth to add banners & images.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("billing")}
                        className="text-xs font-bold bg-black text-white px-3 py-2 rounded-lg"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}

                  {config.theme.hero.enabled && (
                    <div className={`space-y-6 ${isFreePlan ? "opacity-50 pointer-events-none select-none" : ""}`}>
                      <div className="space-y-4 border-b border-zinc-100 pb-6">
                        <label className="text-sm font-bold text-zinc-900">
                          Text Content
                        </label>
                        <input
                          type="text"
                          placeholder="Headline (e.g. SECURE THE BAG)"
                          disabled={isFreePlan}
                          value={
                            isFreePlan
                              ? `Welcome to ${config.name}`
                              : config.theme.hero.headline
                          }
                          onChange={(e) =>
                            setNested(
                              ["theme", "hero", "headline"],
                              e.target.value
                            )
                          }
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-black uppercase tracking-tighter text-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        <input
                          type="text"
                          placeholder="Subheadline (e.g. Limited drops only.)"
                          disabled={isFreePlan}
                          value={
                            isFreePlan
                              ? "Browse our latest collection."
                              : config.theme.hero.subheadline
                          }
                          onChange={(e) =>
                            setNested(
                              ["theme", "hero", "subheadline"],
                              e.target.value
                            )
                          }
                          className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 disabled:opacity-70 disabled:cursor-not-allowed"
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
                          maxSizeMB={2}
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
                            className="w-full accent-black disabled:opacity-50"
                          />
                        </div>
                      </div>
                    </div>
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
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-zinc-900">Footer</h2>
                    <label className="flex items-center gap-2 cursor-pointer text-zinc-900">
                      <span className="text-sm font-medium">Enable Footer</span>
                      <input
                        type="checkbox"
                        disabled={isFreePlan}
                        checked={config.theme.footer.enabled}
                        onChange={(e) =>
                          setNested(
                            ["theme", "footer", "enabled"],
                            e.target.checked
                          )
                        }
                        className="w-5 h-5 accent-black disabled:opacity-50"
                      />
                    </label>
                  </div>
                  {isFreePlan && (
                    <div className="mb-6 bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-zinc-200 rounded-full flex items-center justify-center">
                          <LinkIcon size={18} className="text-zinc-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Footer Locked</p>
                          <p className="text-xs text-zinc-500">
                            Upgrade to Growth to customize your footer.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("billing")}
                        className="text-xs font-bold bg-black text-white px-3 py-2 rounded-lg"
                      >
                        Upgrade
                      </button>
                    </div>
                  )}

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
                  {!isTypeSelected ? (
                    <SetupRequired 
                      title="Billing Locked"
                      description="Please select your store type in the General tab to unlock billing and growth plans."
                      onAction={() => setActiveTab("general")}
                    />
                  ) : (
                    <>
                      {/* Current Plan Card */}
                      <div className="flex flex-col gap-1 mb-4">
                        <h2 className="text-xl font-bold text-white">Account Subscription</h2>
                        <p className="text-xs text-zinc-400 font-medium">One plan. All your stores.</p>
                      </div>
                      
                      <div className="bg-white p-8 rounded-3xl border border-zinc-200 space-y-4 text-zinc-900 flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h2 className="text-xl font-bold text-zinc-900">
                              {userPlan === "growth" ? "Growth Plan" : "Starter Plan"}
                            </h2>
                            {userPlan === "growth" && <BadgeCheck size={20} className="text-blue-500" />}
                          </div>
                          <p className="text-zinc-500 text-sm max-w-md">
                            {userPlan === "growth" && expiryInfo ? (
                              <span className="flex flex-col gap-1">
                                <span className="text-purple-600 font-bold">
                                  Expires in {expiryInfo.days} days ({expiryInfo.date})
                                </span>
                                <span className="text-[11px] text-zinc-400 leading-relaxed">
                                  This plan covers all your stores. If your subscription expires, your secondary stores will be locked and only your oldest store will remain active.
                                </span>
                              </span>
                            ) : (
                              "The standard free plan for individual creators. Allows one active store with basic features."
                            )}
                          </p>
                        </div>
                        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
                          <div
                            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 tracking-widest uppercase ${
                              userPlan === "growth"
                                ? "bg-black text-white"
                                : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                            }`}
                          >
                            {userPlan === "growth" && <Zap size={14} fill="white" />}
                            {userPlan === "growth" ? "ACTIVE PRO" : "BASIC"}
                          </div>
                          {userPlan === "growth" && (
                             <span className="text-[10px] font-black text-zinc-300 uppercase tracking-tighter">Verified Creator Account</span>
                          )}
                        </div>
                      </div>

                      {/* GROWTH UPGRADE CARD */}
                      <div
                        data-tour="settings-billing"
                        className={`p-8 rounded-3xl border relative overflow-hidden ${
                          userPlan === "growth"
                            ? "bg-zinc-50 border-zinc-200"
                            : "bg-white border-zinc-200"
                        }`}
                      >
                        {userPlan === "growth" && (
                          <div className="absolute top-0 right-0 p-4">
                             <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Active</div>
                          </div>
                        )}

                        <div className="mb-6 bg-zinc-100 p-1.5 rounded-xl inline-flex">
                          {(Object.entries(BILLING_PLANS) as [string, any][]).map(
                            ([key, details]) => (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setBillingCycle(key as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                  billingCycle === key
                                    ? "bg-white text-black shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-900"
                                }`}
                              >
                                {details.label}
                              </button>
                            )
                          )}
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                          <div className="space-y-4 max-w-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-black text-white">
                                <Zap size={24} fill="white" />
                              </div>
                              <div>
                                <h3 className="text-2xl font-black text-zinc-900">
                                  {userPlan === "growth" ? "Extend Subscription" : "Upgrade to Growth"}
                                </h3>
                                <p className="font-medium text-zinc-500">
                                  {formatCurrency(BILLING_PLANS[billingCycle].price)}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">
                                  Billed {BILLING_PLANS[billingCycle].label}
                                </p>
                              </div>
                            </div>
                            <ul className="space-y-2">
                              {[
                                "Unlimited Stores (Pro Sync)",
                                "2% Transaction Fee (Reduced from 8%)",
                                "Verified Account Badge",
                                "Instant Withdrawals & Advanced Styling",
                              ].map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 text-sm font-medium text-zinc-600"
                                >
                                  <CheckCircle2 size={16} className="text-zinc-900" /> {item}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="w-full md:w-auto">
                            <button
                              type="button"
                              onClick={handleUpgrade}
                              disabled={loading}
                              className="w-full md:w-auto px-8 py-4 bg-black text-white rounded-xl font-bold hover:scale-105 transition-all shadow-xl shadow-zinc-200"
                            >
                              {userPlan === "growth" ? "Extend Plan" : "Upgrade Account"}
                            </button>
                            <p className="text-xs text-center mt-2 text-zinc-400">
                              Secured by Paystack
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {activeTab === "payouts" && (
                <motion.div
                  data-tour="settings-payouts"
                  key="payouts"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={!isTypeSelected ? "space-y-6" : "bg-white p-8 rounded-3xl border border-zinc-200 space-y-6 text-zinc-900"}
                >
              {!isTypeSelected ? (
                <SetupRequired 
                  title="Payouts Locked"
                  description="We need to know what you're selling before we can set up your payout method."
                  onAction={() => setActiveTab("general")}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-900">
                        Payout Settings
                      </h2>
                      <p className="text-zinc-500 text-sm">
                        Where should we send your earnings?
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 mb-6">
                    * Supported: MTN MoMo, Vodafone Cash, AirtelTigo.
                  </p>

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
                </>
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
                    type="button"
                    onClick={() => handleSave()}
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
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setMessage({
        type: "error",
        text: "Password must be at least 6 characters.",
      });
      setLoading(false);
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      setMessage({ type: "error", text: "User not authenticated." });
      setLoading(false);
      return;
    }

    try {
      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // 2. Update Password
      await updatePassword(user, newPassword);

      setMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password change failed", err);
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password"
      ) {
        setMessage({ type: "error", text: "Current password is incorrect." });
      } else {
        setMessage({
          type: "error",
          text: "Failed to update password. Try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
      {message && (
        <div
          className={`p-3 rounded-xl text-sm font-bold ${
            message.type === "success"
              ? "bg-green-50 text-green-600 border border-green-200"
              : "bg-red-50 text-red-600 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-900">
          Current Password
        </label>
        <PasswordInput
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full p-3 text-black bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-900">New Password</label>
        <PasswordInput
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="w-full text-black p-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-zinc-900">
          Confirm New Password
        </label>
        <PasswordInput
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="w-full text-black p-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin mx-auto" />
        ) : (
          "Update Password"
        )}
      </button>

      <p className="text-xs text-zinc-400 text-center">
        You will stay logged in on this device.
      </p>
    </form>
  );
}
