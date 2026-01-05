"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db, storage } from "@/lib/firebase"; // Assumes storage is exported from firebase.ts
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
} from "firebase/auth";
import {
  Loader2,
  Store,
  CheckCircle2,
  User,
  Building2,
  FileText,
  Upload,
} from "lucide-react";

export default function CreateStoreWizard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Wizard Step: 1 (Vendor) -> 2 (Store)
  const [step, setStep] = useState(1);

  // Vendor Type: Individual vs Company
  const [vendorType, setVendorType] = useState<"individual" | "company">(
    "individual"
  );
  const [companyFile, setCompanyFile] = useState<File | null>(null);

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
    storeType: "product", // "product" | "service"
  });

  // State
  const [isLoginMode, setIsLoginMode] = useState(false);

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
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
        signInWithEmailAndPassword(auth, formData.email, formData.password)
      );
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

      // 2. Upload Verification File (if Company)
      let verificationDocUrl = "";
      if (vendorType === "company" && companyFile && uid) {
        const storageRef = ref(
          storage,
          `verifications/${uid}/${companyFile.name}`
        );
        await uploadBytes(storageRef, companyFile);
        verificationDocUrl = await getDownloadURL(storageRef);
      }

      // 3. Update Public Profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: formData.fullName,
        });
      }

      // 4. Save User Data
      if (uid) {
        const userData: any = {
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

      // Check availability
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        throw new Error("Store URL is already taken. Try a different name.");
      }

      // Create Store
      await setDoc(storeRef, {
        name: formData.storeName,
        slug: storeId,
        category: formData.category,
        type: formData.storeType, // "product" or "service"
        ownerId: auth.currentUser.uid,
        status: "live",
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
        { merge: true }
      );

      // Set Cookie & Redirect
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
                  : "Vendor Details"
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
            /* EXISTING USER LOGIN */
            <form
              onSubmit={handleLoginSubmit}
              className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  <User size={12} className="inline mr-1 mb-0.5" /> Email
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
            /* VENDOR SIGNUP */
            <form
              onSubmit={handleVendorSubmit}
              className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500"
            >
              {/* Vendor Type Toggle */}
              <div className="flex bg-zinc-100 p-1 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setVendorType("individual")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    vendorType === "individual"
                      ? "bg-white shadow text-black"
                      : "text-zinc-500"
                  }`}
                >
                  <User size={16} /> Individual
                </button>
                <button
                  type="button"
                  onClick={() => setVendorType("company")}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    vendorType === "company"
                      ? "bg-white shadow text-black"
                      : "text-zinc-500"
                  }`}
                >
                  <Building2 size={16} /> Company
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                    {vendorType === "company"
                      ? "Company Legal Name"
                      : "Legal Full Name"}
                  </label>
                  <input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder={
                      vendorType === "company"
                        ? "e.g. My Brand Ltd"
                        : "e.g. Kwame Mensah"
                    }
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                    required
                  />
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

              {vendorType === "individual" ? (
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
                    <CheckCircle2 size={10} /> Securely encrypted.
                  </p>
                </div>
              ) : (
                /* Company Fields */
                <div className="space-y-4 border-t border-zinc-100 pt-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Verification Document (Max 1MB)
                    </label>
                    <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer relative">
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        required={!companyFile}
                      />
                      {companyFile ? (
                        <div className="flex items-center gap-2 text-green-600 font-bold">
                          <FileText size={20} /> {companyFile.name}
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload
                            className="mx-auto mb-2 text-zinc-400"
                            size={24}
                          />
                          <p className="text-xs text-zinc-500 font-medium">
                            Click to upload Cert
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            PDF or Image
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs font-bold uppercase tracking-wider text-black pt-2">
                    Contact Person
                  </p>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <input
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        placeholder="Full Name"
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                        required
                      />
                    </div>
                    <div>
                      <input
                        name="contactPosition"
                        value={formData.contactPosition}
                        onChange={handleChange}
                        placeholder="Position (e.g. Manager)"
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                        required
                      />
                    </div>
                    <div>
                      <input
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        placeholder="Phone Number"
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                        required
                      />
                    </div>
                    <div>
                      <input
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        type="email"
                        placeholder="Work Email"
                        className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {!user && (
                <div className="pt-2 border-t border-zinc-100">
                  <div className="grid md:grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Login Email
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
                        Login Password
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
                  </div>
                </div>
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

            <div className="grid grid-cols-2 gap-4">
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
                  What are you selling?
                </label>
                <select
                  name="storeType"
                  value={formData.storeType}
                  onChange={handleChange}
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                >
                  <option value="product">Products (Physical)</option>
                  <option value="service">Services (Digital/Bookings)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                Store URL
              </label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3 focus-within:ring-2 focus-within:ring-black transition-all">
                <span className="text-zinc-400 font-medium text-sm select-none">
                  copdrop.io/shop/
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
