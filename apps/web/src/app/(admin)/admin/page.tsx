"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Set the cookie for middleware to see
      document.cookie = "isAdminLoggedIn=true; path=/";
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tighter">ADMIN PORTAL</h1>
          <p className="text-zinc-500 mt-2">Sign in to manage the drop.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none focus:ring-2 focus:ring-white transition-all text-white placeholder-zinc-500"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl outline-none focus:ring-2 focus:ring-white transition-all text-white placeholder-zinc-500"
            />
          </div>
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-bold text-zinc-400 hover:text-white transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <p className="text-red-400 text-sm font-medium text-center bg-red-900/30 p-3 rounded-lg border border-red-900/50">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black p-4 rounded-xl font-bold tracking-wide hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "ENTER SYSTEM"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Want to sell your own drops?{" "}
          <span
            onClick={() => router.push("/create-store")}
            className="text-white font-bold hover:underline cursor-pointer"
          >
            Create a store
          </span>
        </p>
      </motion.div>
    </div>
  );
}
