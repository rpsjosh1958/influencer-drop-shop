"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { motion } from "framer-motion";

export default function ShopLogin() {
  const router = useRouter();
  const params = useParams(); // Get storeId params
  const storeId = params.storeId as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log("ShopLogin: Mounted. StoreId:", storeId);
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log("ShopLogin: Auth check. User:", user ? user.uid : "null");
      if (user) {
        console.log(
          "ShopLogin: User logged in, redirecting to store home:",
          `/shop/${storeId}`
        );
        router.replace(`/shop/${storeId}`);
      }
    });
    return () => unsub();
  }, [router, storeId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push(`/shop/${storeId}`);
    } catch (err: any) {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-black">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tighter">
            WELCOME BACK.
          </h1>
          <p className="text-zinc-500 mt-2">Sign in to access your orders.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
          </div>
          <div>
            <PasswordInput
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
          </div>
          <div className="flex justify-end">
            <Link
              href={`/shop/${storeId}/forgot-password`}
              className="text-sm font-bold text-zinc-400 hover:text-black transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-xl font-bold tracking-wide hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "SIGN IN"}
          </button>
        </form>

        <div className="text-center space-y-4 pt-4">
          <p className="text-zinc-500 text-sm">
            Don't have an account?{" "}
            <Link
              href={`/shop/${storeId}/signup`}
              className="text-black font-bold hover:underline"
            >
              Join the movement
            </Link>
          </p>
          <Link
            href={`/shop/${storeId}`}
            className="inline-block text-xs font-bold text-zinc-400 hover:text-black uppercase tracking-widest transition-colors"
          >
            Continue as Guest
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
