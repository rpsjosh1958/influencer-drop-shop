"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc } from "firebase/firestore";
import { functions, db } from "@/lib/firebase";
import { Loader2, ArrowLeft, Mail, Store } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ShopForgotPasswordPage() {
  const params = useParams();
  const storeId = params.storeId as string;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [storeName, setStoreName] = useState("Store");
  const [storeLogo, setStoreLogo] = useState("");

  useEffect(() => {
    if (storeId) {
      const fetchStore = async () => {
        try {
          const docSnap = await getDoc(doc(db, "stores", storeId)); // Assuming param is storeId/slug
          // In reality, [storeId] might be slug. Resolve slug if needed.
          // For now assuming ID or Slug resolution logic is generic.
          // If using slug, we query where slug == storeId.
          // Let's assume we can get name/logo.
          if (docSnap.exists()) {
            const data = docSnap.data();
            setStoreName(data.name);
            setStoreLogo(data.logo);
          }
        } catch (e) {
          console.error("Failed to load store info");
        }
      };
      fetchStore();
    }
  }, [storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const sendResetFn = httpsCallable(functions, "sendPasswordReset");
      // userType 'customer' could be used to customize email template e.g. "Your account at [StoreName]"
      await sendResetFn({
        email,
        userType: "customer",
        storeId,
        origin: window.location.origin,
      });
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send reset link. Check the email.");
    } finally {
      setLoading(false);
    }
  };

  const loginLink = `/shop/${storeId}/login`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-xl p-8 space-y-8">
        <div className="text-center space-y-4">
          {storeLogo ? (
            <div className="w-16 h-16 relative mx-auto rounded-full overflow-hidden border border-zinc-100">
              <Image
                src={storeLogo}
                alt={storeName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto bg-black text-white rounded-full flex items-center justify-center">
              <Store size={24} />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Reset Password
            </h1>
            <p className="text-zinc-500">for {storeName}</p>
          </div>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Mail className="text-green-600" size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-lg">Check your email</h3>
              <p className="text-zinc-500 text-sm">
                We sent a password reset link to{" "}
                <span className="font-bold text-black dark:text-white">
                  {email}
                </span>
                .
              </p>
            </div>
            <Link
              href={loginLink}
              className="block w-full py-3 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
            >
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-500">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>
        )}

        {!success && (
          <div className="text-center">
            <Link
              href={loginLink}
              className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
