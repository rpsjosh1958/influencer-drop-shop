"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db, storage } from "@/lib/firebase"; 
import {
  doc,
  setDoc,
  getDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import {
  Loader2,
  Store,
  CheckCircle2,
  User,
  Building2,
  FileText,
  Upload,
  Package, 
  ShoppingBag, 
  Tag, 
  CreditCard, 
  ShoppingBasket, 
  Sparkles,
  Zap,
  Star,
  Truck,
  Trophy,
  Gift,
  Coins,
  Ticket,
  Shirt,
  Watch,
  Gem,
  BadgePercent,
  Heart,
  ChevronDown,
  ArrowLeft,
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { StoreSuccessModal } from "@/components/onboarding/store-success-modal";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getErrorMessage, getErrorCode } from "@/lib/errors";
import type { LucideIcon } from "lucide-react";

// --- Sub-components for the floating icons ---
interface FloatingIconProps {
  icon: LucideIcon;
  delay: number;
  x: string;
  y: string;
  size?: number;
}

const FloatingIcon = ({ icon: Icon, delay, x, y, size = 24 }: FloatingIconProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ 
      opacity: [0.2, 0.4, 0.2],
      y: [0, -20, 0],
      x: [0, 10, 0],
      rotate: [0, 10, -10, 0],
      scale: [1, 1.1, 1]
    }}
    transition={{ 
      duration: 10 + Math.random() * 5,
      repeat: Infinity,
      delay: delay,
      ease: "easeInOut"
    }}
    className="absolute pointer-events-none text-zinc-300"
    style={{ left: x, top: y }}
  >
    <Icon size={size} />
  </motion.div>
);

export default function CreateStoreWizard() {
  const router = useRouter();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // A real way out — this page previously had zero navigation at all, so
  // anyone landing here who didn't actually want to register as a vendor
  // (e.g. a customer redirected here by mistake) had no way to leave
  // except closing the tab.
  const [lastVisitedStore, setLastVisitedStore] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copdrop_last_visited_store");
      if (saved) setLastVisitedStore(saved);
    }
  }, []);

  // Wizard Step: 1 (Vendor) -> 2 (Store)
  const [step, setStep] = useState(1);

  // Must both be checked before the store can actually be created —
  // enforced both via the submit button's disabled state and a guard at
  // the top of handleStoreSubmit, in case that's ever bypassed.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);

  // Vendor Type: Individual vs Company
  const [vendorType, setVendorType] = useState<"individual" | "company">(
    "individual",
  );
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    // Step 1: Vendor
    fullName: "", // For companies: Company Name
    email: "",
    password: "",
    phone: "",
    ghanaCard: "", // Individual only
    // Company Specific
    contactName: "",
    contactPosition: "",
    contactPhone: "",
    contactEmail: "",

    // Step 2: Store
    storeName: "",
    storeSlug: "",
    category: "Fashion",
    storeType: "product", // "product" | "service" | "hybrid"
  });

  // State
  const [isLoginMode, setIsLoginMode] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setFormData((prev) => ({ ...prev, email: u.email || "" }));
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "storeName") {
        next.storeSlug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }
      return next;
    });
    setError("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 1024 * 1024) {
        // 1MB limit
        setError("File size too large. Max 1MB.");
        return;
      }
      setCompanyFile(file);
      setError("");
    }
  };

  const handleIdImageChange =
    (setter: (file: File) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 1024 * 1024) {
          // 1MB limit
          setError("File size too large. Max 1MB.");
          return;
        }
        setter(file);
        setError("");
      }
    };

  const handleGhanaCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.toUpperCase();

    // Allow full clearing
    if (input === "") {
      setFormData((prev) => ({ ...prev, ghanaCard: "" }));
      return;
    }

    // Extract numbers only
    const digits = input.replace(/[^0-9]/g, "");

    // Reconstruct with GHA- prefix
    let formatted = "GHA-";

    // Append first 9 digits
    if (digits.length > 0) {
      formatted += digits.substring(0, 9);
    }

    // Append last digit with hyphen
    if (digits.length > 9) {
      formatted += "-" + digits.substring(9, 10);
    }

    setFormData((prev) => ({ ...prev, ghanaCard: formatted }));
  };

  // --- Step 1A: Login (Existing User) ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!formData.email || !formData.password) {
        throw new Error("Please enter email and password.");
      }
      await import("firebase/auth").then(({ signInWithEmailAndPassword }) =>
        signInWithEmailAndPassword(auth, formData.email, formData.password),
      );
      setStep(2);
    } catch (err) {
      console.error(err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 1B: Sign Up (New Vendor) ---
  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let uid = user?.uid;

      // 1. Create Auth User if not logged in
      if (!user) {
        if (!formData.email || !formData.password) {
          throw new Error("Email and Password are required.");
        }
        try {
          const credential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password,
          );
          uid = credential.user.uid;
        } catch (authErr) {
          if (getErrorCode(authErr) === "auth/email-already-in-use") {
            setIsLoginMode(true);
            throw new Error(
              "Looks like you already have an account! Please login to add a new store.",
            );
          }
          throw authErr;
        }
      }

      // 2. Upload Verification Files (Company doc, or ID front/back)
      let verificationDocUrl = "";
      let idFrontUrl = "";
      let idBackUrl = "";
      if (vendorType === "company" && companyFile && uid) {
        const storageRef = ref(
          storage,
          `verifications/${uid}/${companyFile.name}`,
        );
        await uploadBytes(storageRef, companyFile);
        verificationDocUrl = await getDownloadURL(storageRef);
      } else if (vendorType === "individual" && uid && idFrontFile && idBackFile) {
        const frontRef = ref(
          storage,
          `verifications/${uid}/id-front-${idFrontFile.name}`,
        );
        const backRef = ref(
          storage,
          `verifications/${uid}/id-back-${idBackFile.name}`,
        );
        await uploadBytes(frontRef, idFrontFile);
        await uploadBytes(backRef, idBackFile);
        idFrontUrl = await getDownloadURL(frontRef);
        idBackUrl = await getDownloadURL(backRef);
      }

      // 3. Update Public Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.fullName,
        });
      }

      // 4. Save User Data
      if (uid) {
        const userData: {
          fullName: string;
          phone: string;
          email: string;
          createdAt: ReturnType<typeof serverTimestamp>;
          vendorType: typeof vendorType;
          identity: {
            verified: boolean;
            ghanaCard?: string;
            ghanaCardFrontUrl?: string;
            ghanaCardBackUrl?: string;
            companyDoc?: string;
          };
          contactPerson?: {
            name: string;
            position: string;
            phone: string;
            email: string;
          };
        } = {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          createdAt: serverTimestamp(),
          vendorType,
          identity: {
            verified: false,
          },
        };

        if (vendorType === "individual") {
          userData.identity.ghanaCard = formData.ghanaCard;
          userData.identity.ghanaCardFrontUrl = idFrontUrl;
          userData.identity.ghanaCardBackUrl = idBackUrl;
        } else {
          userData.identity.companyDoc = verificationDocUrl;
          userData.contactPerson = {
            name: formData.contactName,
            position: formData.contactPosition,
            phone: formData.contactPhone,
            email: formData.contactEmail,
          };
        }

        await setDoc(doc(db, "users", uid), userData, { merge: true });
      }

      setStep(2);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Create Store ---
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    if (!agreedToTerms || !agreedToPrivacy) {
      setError("Please accept the Terms of Service and Privacy Policy to continue.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const storeId = formData.storeSlug;
      if (!storeId) throw new Error("Invalid store URL.");

      const storeRef = doc(db, "stores", storeId);

      // Check availability
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        throw new Error("Store URL is already taken. Try a different name.");
      }

      // Derive features from store type
      const storeType = formData.storeType as "product" | "service" | "hybrid";
      const features = {
        hasProducts: storeType === "product" || storeType === "hybrid",
        hasServices: storeType === "service" || storeType === "hybrid",
        hasPreorders: storeType === "hybrid",
      };

      // Create Store
      await setDoc(storeRef, {
        name: formData.storeName,
        slug: storeId,
        category: formData.category,
        type: storeType,
        features,
        ownerId: auth.currentUser.uid,
        // "closed" isn't one of StoreConfig's status literals
        // ("live"|"maintenance"|"unpaid") — same pre-existing mismatch
        // flagged in vendor-details-modal.tsx. Functionally harmless today
        // (every read site only checks `=== "live"`), but worth a real
        // look at what "closed" is supposed to mean before tightening.
        status: "closed",
        onboardingStatus: "pending",
        isVerified: false,
        isSuspended: false,
        plan: "starter",
        createdAt: serverTimestamp(),
        theme: {
          primaryColor: "#000000",
          heroText: `WELCOME TO ${formData.storeName.toUpperCase()}`,
          footerText: `© 2026 ${formData.storeName}`,
        },
      });

      // Link to User
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          ownedStores: arrayUnion(storeId),
        },
        { merge: true },
      );

      // Set Cookie & Redirect
      document.cookie = "isAdminLoggedIn=true; path=/";
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err) || "Failed to create store.");
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-black outline-none font-medium text-black placeholder-zinc-400 transition-all text-sm";
  const labelClasses = "block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 ml-1";

  return (
    <div className="min-h-screen w-full bg-white text-zinc-900 relative overflow-hidden flex items-center justify-center p-6">
      <Link
        href={lastVisitedStore ? `/shop/${lastVisitedStore}` : "/"}
        className="fixed top-6 left-6 z-20 flex items-center gap-2 text-xs font-black text-zinc-400 hover:text-black uppercase tracking-widest transition-colors"
      >
        <ArrowLeft size={16} />
        {lastVisitedStore ? "Back to Shop" : "Back Home"}
      </Link>

      {/* Floating E-commerce Icons */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <FloatingIcon icon={Package} x="10%" y="15%" delay={0} size={32} />
        <FloatingIcon icon={ShoppingBag} x="85%" y="10%" delay={2} size={40} />
        <FloatingIcon icon={Tag} x="75%" y="80%" delay={4} size={28} />
        <FloatingIcon icon={CreditCard} x="15%" y="75%" delay={1} size={36} />
        <FloatingIcon icon={ShoppingBasket} x="50%" y="5%" delay={3} size={30} />
        <FloatingIcon icon={Sparkles} x="90%" y="60%" delay={5} size={24} />
        <FloatingIcon icon={Zap} x="5%" y="50%" delay={2.5} size={32} />
        <FloatingIcon icon={Star} x="40%" y="90%" delay={1.5} size={26} />
        <FloatingIcon icon={Truck} x="25%" y="10%" delay={6} size={30} />
        <FloatingIcon icon={Trophy} x="65%" y="15%" delay={7} size={28} />
        <FloatingIcon icon={Gift} x="95%" y="40%" delay={8} size={34} />
        <FloatingIcon icon={Coins} x="5%" y="30%" delay={9} size={22} />
        <FloatingIcon icon={Ticket} x="80%" y="65%" delay={10} size={36} />
        <FloatingIcon icon={Shirt} x="20%" y="85%" delay={11} size={38} />
        <FloatingIcon icon={Watch} x="60%" y="5%" delay={12} size={24} />
        <FloatingIcon icon={Gem} x="45%" y="75%" delay={13} size={32} />
        <FloatingIcon icon={BadgePercent} x="35%" y="25%" delay={14} size={30} />
        <FloatingIcon icon={Heart} x="88%" y="90%" delay={15} size={28} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10 flex flex-col max-h-[90vh]"
      >
        <div className="w-full bg-white rounded-[40px] shadow-2xl border border-zinc-100 flex flex-col overflow-hidden relative group">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8 md:p-10 scroll-smooth">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="h-14 w-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/10 rotate-3">
                <Store size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">
                  Build Your Store.
                </h1>
                <p className="text-zinc-500 text-sm font-medium">
                  Step {step} of 2: {step === 1 ? (isLoginMode ? "Vendor Login" : "Vendor Details") : "Store Setup"}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-zinc-100 rounded-full mb-8 flex overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: step === 1 ? "50%" : "100%" }}
                className="h-full bg-black"
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-2xl border border-red-100 mb-6 flex items-start gap-2"
              >
                <div className="shrink-0 mt-0.5">⚠️</div>
                <span>{error}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 ? (
                isLoginMode ? (
                  /* EXISTING USER LOGIN */
                  <motion.form
                    key="login-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleLoginSubmit}
                    className="space-y-6"
                  >

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className={labelClasses}>Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className={inputClasses}
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClasses}>Password</label>
                        <PasswordInput
                          type="password"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={inputClasses}
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 mt-4 uppercase tracking-widest"
                    >
                      {loading ? <Loader2 className="animate-spin" /> : "Login & Continue"}
                    </button>

                    <p className="text-center text-sm text-zinc-500">
                      New here?{" "}
                      <button
                        type="button"
                        onClick={() => { setIsLoginMode(false); setError(""); }}
                        className="text-black font-bold hover:underline"
                      >
                        Create an account
                      </button>
                    </p>
                  </motion.form>
                ) : (
                  /* VENDOR SIGNUP */
                  <motion.form
                    key="signup-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleVendorSubmit}
                    className="space-y-6"
                  >
                    

                    <div className="flex bg-zinc-50 p-1.5 rounded-2xl border border-zinc-100">
                      <button
                        type="button"
                        onClick={() => setVendorType("individual")}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                          vendorType === "individual" ? "bg-white shadow-md text-black" : "text-zinc-400 hover:text-zinc-600"
                        )}
                      >
                        <User size={16} /> Individual
                      </button>
                      <button
                        type="button"
                        onClick={() => setVendorType("company")}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                          vendorType === "company" ? "bg-white shadow-md text-black" : "text-zinc-400 hover:text-zinc-600"
                        )}
                      >
                        <Building2 size={16} /> Company
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className={labelClasses}>{vendorType === "company" ? "Company Legal Name" : "Legal Full Name"}</label>
                        <input name="fullName" value={formData.fullName} onChange={handleChange} placeholder={vendorType === "company" ? "e.g. My Brand Ltd" : "e.g. Kwame Mensah"} className={inputClasses} required />
                      </div>
                      <div className="space-y-1">
                        <label className={labelClasses}>Phone Number</label>
                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="054xxxxxxx" className={inputClasses} required />
                      </div>
                    </div>

                    {vendorType === "individual" ? (
                      <div className="space-y-6">
                        <div className="space-y-1">
                          <label className={labelClasses}>Ghana Card (NIA)</label>
                          <input name="ghanaCard" value={formData.ghanaCard} onChange={handleGhanaCardChange} onFocus={() => { if (!formData.ghanaCard) setFormData(prev => ({ ...prev, ghanaCard: "GHA-" })); }} maxLength={15} placeholder="GHA-xxxxxxxxx-x" className={inputClasses} required />
                          <p className="text-[10px] text-zinc-400 mt-2 flex items-center gap-1.5 ml-1">
                            <CheckCircle2 size={12} className="text-green-500" /> Securely encrypted and stored.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <label className={labelClasses}>Ghana Card Photos (Max 1MB each)</label>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-6 flex flex-col items-center justify-center bg-zinc-50 hover:bg-zinc-100 transition-all cursor-pointer relative group">
                              <input type="file" accept="image/*" onChange={handleIdImageChange(setIdFrontFile)} className="absolute inset-0 opacity-0 cursor-pointer" required={!idFrontFile} />
                              {idFrontFile ? (
                                <div className="flex flex-col items-center gap-1 text-black font-black text-xs uppercase tracking-widest text-center"><FileText size={18} /> {idFrontFile.name}</div>
                              ) : (
                                <div className="text-center">
                                  <Upload className="mx-auto mb-2 text-zinc-300 group-hover:text-black transition-colors" size={24} />
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Front</p>
                                </div>
                              )}
                            </div>
                            <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-6 flex flex-col items-center justify-center bg-zinc-50 hover:bg-zinc-100 transition-all cursor-pointer relative group">
                              <input type="file" accept="image/*" onChange={handleIdImageChange(setIdBackFile)} className="absolute inset-0 opacity-0 cursor-pointer" required={!idBackFile} />
                              {idBackFile ? (
                                <div className="flex flex-col items-center gap-1 text-black font-black text-xs uppercase tracking-widest text-center"><FileText size={18} /> {idBackFile.name}</div>
                              ) : (
                                <div className="text-center">
                                  <Upload className="mx-auto mb-2 text-zinc-300 group-hover:text-black transition-colors" size={24} />
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Back</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 border-t border-zinc-100 pt-6">
                        <div className="space-y-1">
                          <label className={labelClasses}>Verification Document (Max 1MB)</label>
                          <div className="border-2 border-dashed border-zinc-100 rounded-2xl p-8 flex flex-col items-center justify-center bg-zinc-50 hover:bg-zinc-100 transition-all cursor-pointer relative group">
                            <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" required={!companyFile} />
                            {companyFile ? (
                              <div className="flex items-center gap-2 text-black font-black text-sm uppercase tracking-widest"><FileText size={20} /> {companyFile.name}</div>
                            ) : (
                              <div className="text-center">
                                <Upload className="mx-auto mb-3 text-zinc-300 group-hover:text-black transition-colors" size={32} />
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Click to upload Cert</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <input name="contactName" value={formData.contactName} onChange={handleChange} placeholder="Contact Person" className={inputClasses} required />
                          <input name="contactPosition" value={formData.contactPosition} onChange={handleChange} placeholder="Position" className={inputClasses} required />
                          <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} placeholder="Contact Phone" className={inputClasses} required />
                          <input name="contactEmail" value={formData.contactEmail} onChange={handleChange} type="email" placeholder="Contact Email" className={inputClasses} required />
                        </div>
                      </div>
                    )}


                    {!user && (
                      <div className=" space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className={labelClasses}>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" className={inputClasses} required />
                          </div>
                          <div className="space-y-1">
                            <label className={labelClasses}>Secure Password</label>
                            <PasswordInput type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" className={inputClasses} required minLength={6} />
                          </div>
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-2xl font-black text-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 mt-4 uppercase tracking-widest">
                      {loading ? <Loader2 className="animate-spin" /> : "NEXT STEP"}
                    </button>

                    <p className="text-center text-sm text-zinc-500">
                      Already have an account?{" "}
                      <button type="button" onClick={() => { setIsLoginMode(true); setError(""); }} className="text-black font-bold hover:underline">Login</button>
                    </p>
                  </motion.form>
                )
              ) : (
                /* STEP 2: STORE FORM */
                <motion.form
                  key="store-form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleStoreSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <label className={labelClasses}>Store Name</label>
                    <input name="storeName" value={formData.storeName} onChange={handleChange} placeholder="e.g. Vintage Vibes" className={inputClasses} required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className={labelClasses}>Category</label>
                      <select name="category" value={formData.category} onChange={handleChange} className={inputClasses}>
                        <option value="Fashion">Fashion & Apparel</option>
                        <option value="Beauty">Beauty & Cosmetics</option>
                        <option value="Art">Art & Digital</option>
                        <option value="Food">Food & Beverage</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className={labelClasses}>Store Type</label>
                      <select name="storeType" value={formData.storeType} onChange={handleChange} className={inputClasses}>
                        <option value="product">Products Only</option>
                        <option value="service">Services Only</option>
                        <option value="hybrid">Hybrid (Both)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClasses}>Store URL</label>
                    <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-black transition-all">
                      <span className="text-zinc-400 font-bold text-xs select-none uppercase tracking-tighter">copdrop.io/shop/</span>
                      <input name="storeSlug" value={formData.storeSlug} onChange={handleChange} className="flex-1 p-4 bg-transparent focus:outline-none font-black text-black text-sm" required />
                    </div>
                  </div>

                  <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles size={40} className="text-black" />
                    </div>
                    <h4 className="font-black text-xs text-black uppercase tracking-widest mb-1">Starter Plan (Active)</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">You are starting on the free plan (8% fee). You can upgrade to Growth later for lower fees and a verified badge.</p>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        required
                        className="mt-0.5 w-4 h-4 rounded accent-black shrink-0"
                      />
                      <span className="text-xs text-zinc-600 leading-relaxed">
                        I agree to The Drop&apos;s{" "}
                        <Link href="/terms" target="_blank" className="font-bold text-black underline underline-offset-2">
                          Terms of Service
                        </Link>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={agreedToPrivacy}
                        onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                        required
                        className="mt-0.5 w-4 h-4 rounded accent-black shrink-0"
                      />
                      <span className="text-xs text-zinc-600 leading-relaxed">
                        I have read and accept the{" "}
                        <Link href="/privacy" target="_blank" className="font-bold text-black underline underline-offset-2">
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setStep(1)} className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs bg-zinc-100 text-zinc-400 hover:bg-zinc-200 hover:text-black transition-all">Back</button>
                    <button type="submit" disabled={loading || !agreedToTerms || !agreedToPrivacy} className="flex-1 bg-black text-white py-4 rounded-2xl font-black text-lg hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xl shadow-black/10 uppercase tracking-widest disabled:opacity-40 disabled:hover:scale-100">
                      {loading ? <Loader2 className="animate-spin" /> : "LAUNCH STORE"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Scroll Indicator */}
          <motion.div 
            animate={{ y: [0, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-4 right-8 pointer-events-none text-zinc-400 flex flex-col items-center gap-0.5"
          >
            <span className="text-[8px] font-black uppercase tracking-[0.2em]">Scroll</span>
            <ChevronDown size={12} />
          </motion.div>
        </div>
      </motion.div>

      {/* Success Modal shown after store creation */}
      <StoreSuccessModal
        isOpen={showSuccessModal}
        onContinue={() => {
          setShowSuccessModal(false);
          router.push("/admin/dashboard");
        }}
        userEmail={formData.email || user?.email || ""}
      />
    </div>
  );
}
