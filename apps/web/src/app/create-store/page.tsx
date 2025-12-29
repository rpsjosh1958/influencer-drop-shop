"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  getDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  Loader2,
  Store,
  ArrowRight,
  CheckCircle2,
  User,
  Building2,
} from "lucide-react";

export default function CreateStoreWizard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Wizard Step: 1 (Vendor) -> 2 (Store)
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    // Step 1: Vendor (Personal)
    fullName: "",
    email: "",
    password: "",
    phone: "",
    ghanaCard: "", // Sensitive
    // Step 2: Store
    storeName: "",
    storeSlug: "",
    category: "Fashion",
  });

  // State
  const [isLoginMode, setIsLoginMode] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // If user already logged in, autofill email and skip password
        setFormData((prev) => ({ ...prev, email: u.email || "" }));
        // If they are logged in, we implicitly skip Step 1 validation in the UI usually,
        // but here we just let them proceed to Step 2 if they click "Next".
      }
    });
    return () => unsub();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-generate slug
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

  // --- Step 1A: Login (Existing User) ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (!formData.email || !formData.password) {
        throw new Error("Please enter email and password.");
      }
      // 1. Sign In
      await import("firebase/auth").then(({ signInWithEmailAndPassword }) =>
        signInWithEmailAndPassword(auth, formData.email, formData.password)
      );
      // 2. Proceed
      setStep(2);
    } catch (err: any) {
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
            formData.password
          );
          uid = credential.user.uid;
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use") {
            setIsLoginMode(true);
            throw new Error(
              "Looks like you already have an account! Please login to add a new store."
            );
          }
          throw authErr;
        }
      }

      // 2. Update Public Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.fullName,
        });
      }

      // 3. Save Sensitive Data (Securely)
      if (uid) {
        await setDoc(
          doc(db, "users", uid),
          {
            fullName: formData.fullName,
            phone: formData.phone,
            email: formData.email,
            createdAt: serverTimestamp(),
            identity: {
              ghanaCard: formData.ghanaCard,
              verified: false,
            },
          },
          { merge: true }
        );
      }

      // 4. Move to Step 2
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Create Store ---
  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);
    setError("");

    try {
      const storeId = formData.storeSlug;
      if (!storeId) throw new Error("Invalid store URL.");

      const storeRef = doc(db, "stores", storeId);

      // 1. Check availability
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        throw new Error("Store URL is already taken. Try a different name.");
      }

      // 2. Create Store
      await setDoc(storeRef, {
        name: formData.storeName,
        slug: storeId,
        category: formData.category,
        ownerId: auth.currentUser.uid,
        status: "live",
        plan: "starter", // Default to Free Plan
        createdAt: serverTimestamp(),
        theme: {
          primaryColor: "#000000",
          heroText: `WELCOME TO ${formData.storeName.toUpperCase()}`,
          footerText: `© 2025 ${formData.storeName}`,
        },
      });

      // 3. Link to User
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          ownedStores: arrayUnion(storeId),
        },
        { merge: true }
      );

      // 4. Set Admin Cookie & Redirect
      document.cookie = "isAdminLoggedIn=true; path=/";
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create store.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 text-zinc-900 font-sans">
      <div className="w-full max-w-lg bg-white p-8 rounded-3xl shadow-xl border border-zinc-100">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 bg-black rounded-full flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Store size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Build Your Store
            </h1>
            <p className="text-zinc-500 text-sm">
              Step {step} of 2:{" "}
              {step === 1
                ? isLoginMode
                  ? "Vendor Login"
                  : "Vendor Signup"
                : "Store Setup"}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-zinc-100 rounded-full mb-8 flex overflow-hidden">
          <div
            className={`h-full bg-black transition-all duration-500 ease-out ${
              step === 1 ? "w-1/2" : "w-full"
            }`}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl mb-6 border border-red-100 flex items-start gap-2">
            <div className="shrink-0 mt-0.5">⚠️</div>
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          isLoginMode ? (
            /* STEP 1: EXISTING USER LOGIN */
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <User size={12} className="inline mr-1 mb-0.5" /> Email
                  Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Login & Continue"
                )}
              </button>
              <p className="text-center text-sm text-zinc-500">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(false);
                    setError("");
                  }}
                  className="font-bold underline"
                >
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            /* STEP 1: VENDOR FORM (SIGNUP) */
            <form
              onSubmit={handleVendorSubmit}
              className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500"
            >
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Legal Full Name
                  </label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="e.g. Kwame Mensah"
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                    required
                  />
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs leading-relaxed text-amber-800 flex gap-2">
                    <div className="shrink-0 mt-0.5">⚠️</div>
                    <p>
                      <strong>Important for Payouts:</strong> This name must
                      match your Mobile Money or Bank Account name. We use this
                      to verify withdrawals. Mismatches may delay your money.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    Phone (Momo)
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="054xxxxxxx"
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Ghana Card (NIA)
                </label>
                <input
                  name="ghanaCard"
                  value={formData.ghanaCard}
                  onChange={handleChange}
                  placeholder="GHA-xxxxxxxxx-x"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                  required
                />
                <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Securely encrypted. Used for
                  identity verification only.
                </p>
              </div>

              {!user && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Next Step"}
              </button>

              <p className="text-center text-sm text-zinc-500">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(true);
                    setError("");
                  }}
                  className="font-bold underline"
                >
                  Login
                </button>
              </p>

              {user && (
                <p className="text-xs text-center text-zinc-400">
                  Logged in as <b>{user.email}</b>
                </p>
              )}
            </form>
          )
        ) : (
          /* STEP 2: STORE FORM */
          <form
            onSubmit={handleStoreSubmit}
            className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500"
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Store Name
              </label>
              <input
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                placeholder="e.g. Vintage Vibes"
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
              >
                <option value="Fashion">Fashion & Apparel</option>
                <option value="Beauty">Beauty & Cosmetics</option>
                <option value="Art">Art & Digital</option>
                <option value="Food">Food & Beverage</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Store URL
              </label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-black transition-all">
                <span className="text-zinc-400 font-medium text-sm select-none">
                  drop.com/shop/
                </span>
                <input
                  name="storeSlug"
                  value={formData.storeSlug}
                  onChange={handleChange}
                  className="flex-1 p-3 bg-transparent focus:outline-none font-bold text-black"
                  required
                />
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
              <h4 className="font-bold text-sm text-purple-900 mb-1">
                Starter Plan (Active)
              </h4>
              <p className="text-xs text-purple-700">
                You are starting on the free plan (8% fee). You can upgrade to
                Growth later.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-6 py-4 rounded-xl font-bold bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Launch Store"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
