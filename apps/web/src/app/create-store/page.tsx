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
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Loader2, Store, ArrowRight } from "lucide-react";

export default function CreateStorePage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  // Auth State for inline flow
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlug(val));
    setError("");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        // User state will update automatically via observer
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError("");

    try {
      const storeId = slug;
      const storeRef = doc(db, "stores", storeId);

      // 1. Check availability
      const storeSnap = await getDoc(storeRef);
      if (storeSnap.exists()) {
        setError("Store URL is already taken. Try a different name.");
        setLoading(false);
        return;
      }

      // 2. Create Store
      await setDoc(storeRef, {
        name,
        slug,
        ownerId: user.uid,
        status: "live",
        createdAt: serverTimestamp(),
        theme: {
          primaryColor: "#000000",
          heroText: "WELCOME TO THE DROP.",
          footerText: `© 2025 ${name}`,
        },
      });

      // 3. Update User
      await setDoc(
        doc(db, "users", user.uid),
        {
          ownedStores: arrayUnion(storeId),
        },
        { merge: true }
      );

      // 4. Redirect
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create store.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 text-zinc-900">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-zinc-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white">
            <Store size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user ? "Name Your Store" : "Create Merchant Account"}
          </h1>
        </div>

        {/* If USER is logged in, show Store Creation Form */}
        {user ? (
          <form onSubmit={handleCreateStore} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2">Store Name</label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Josh's Kicks"
                className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">Store URL</label>
              <div className="flex items-center bg-zinc-50 border border-zinc-200 rounded-xl px-3">
                <span className="text-zinc-400 font-medium text-sm">
                  drop.com/shop/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(generateSlug(e.target.value))}
                  className="flex-1 p-3 bg-transparent focus:outline-none font-bold text-black"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Launch Store <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        ) : (
          /* If NO USER, show Auth Form */
          <form onSubmit={handleAuth} className="space-y-4">
            <p className="text-sm text-zinc-500 mb-4">
              To start selling, you first need a merchant account.
            </p>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-bold tracking-wide hover:bg-zinc-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : authMode === "signup" ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>

            <div className="text-center text-sm text-zinc-500 mt-4">
              {authMode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("login")}
                    className="text-black font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </>
              ) : (
                <>
                  New to Drop?{" "}
                  <button
                    type="button"
                    onClick={() => setAuthMode("signup")}
                    className="text-black font-bold hover:underline"
                  >
                    Create account
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
