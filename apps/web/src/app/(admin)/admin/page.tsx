"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { 
  Loader2, 
  Package, 
  ShoppingBag, 
  Tag, 
  CreditCard, 
  ShoppingBasket, 
  Sparkles,
  Zap,
  Star,
  Chrome,
  Apple,
  Truck,
  Trophy,
  Gift,
  Coins,
  Ticket,
  Shirt,
  Watch,
  Gem,
  BadgePercent,
  Heart
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

// --- Sub-components for the floating icons ---
const FloatingIcon = ({ icon: Icon, delay, x, y, size = 24 }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ 
      opacity: [0.4, 0.7, 0.4],
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
    className="absolute pointer-events-none text-white"
    style={{ left: x, top: y }}
  >
    <Icon size={size} />
  </motion.div>
);

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastVisitedStore, setLastVisitedStore] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("copdrop_last_visited_store");
      if (saved) setLastVisitedStore(saved);
    }
  }, []);

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
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden flex items-center justify-center p-6">
      
      {/* Floating E-commerce Icons */}
      <div className="absolute inset-0 pointer-events-none opacity-25 overflow-hidden">
        <FloatingIcon icon={Package} x="10%" y="15%" delay={0} size={32} />
        <FloatingIcon icon={ShoppingBag} x="85%" y="10%" delay={2} size={40} />
        <FloatingIcon icon={Tag} x="75%" y="80%" delay={4} size={28} />
        <FloatingIcon icon={CreditCard} x="15%" y="75%" delay={1} size={36} />
        <FloatingIcon icon={ShoppingBasket} x="50%" y="5%" delay={3} size={30} />
        <FloatingIcon icon={Sparkles} x="90%" y="40%" delay={5} size={24} />
        <FloatingIcon icon={Zap} x="5%" y="50%" delay={2.5} size={32} />
        <FloatingIcon icon={ShoppingBag} x="28%" y="50%" delay={2.5} size={32} />
        <FloatingIcon icon={Star} x="40%" y="90%" delay={1.5} size={26} />
        
        {/* 10 Additional Icons */}
        <FloatingIcon icon={Truck} x="25%" y="10%" delay={6} size={30} />
        <FloatingIcon icon={Trophy} x="65%" y="15%" delay={7} size={28} />
        <FloatingIcon icon={Gift} x="75%" y="40%" delay={8} size={34} />
        <FloatingIcon icon={Coins} x="20%" y="30%" delay={9} size={22} />
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
        className="w-full max-w-md relative z-10"
      >
        {/* Login Container */}
        <div className="w-full backdrop-blur-3xl bg-zinc-900/40 border border-white/10 rounded-[40px] p-8 md:p-10 shadow-2xl shadow-black/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Admin Portal.</h1>
            <p className="text-zinc-500 mt-2 text-sm font-medium">Log in to manage your drops.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Email Address</label>
              <input
                type="email"
                placeholder="admin@copdrop.io"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-800/50 border border-white/5 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-zinc-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Password</label>
              <PasswordInput
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-800/50 border border-white/5 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-white placeholder-zinc-600"
                iconClassName="text-zinc-500 hover:text-white"
              />
            </div>
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-zinc-500 hover:text-white transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-red-400 text-xs font-medium text-center bg-red-900/20 p-3 rounded-xl border border-red-900/30"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black p-4 rounded-2xl font-black tracking-widest hover:bg-zinc-200 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-white/5"
            >
              {loading ? <Loader2 className="animate-spin text-black" /> : "LOGIN"}
            </button>
          </form>

          {/* Social Sign In Options */}
          <div className="mt-8 space-y-6">
            <div className="relative">
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="px-2 bg-transparent text-zinc-500 font-black tracking-widest">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-zinc-800/50 hover:bg-zinc-800 text-white border border-white/5 transition-all duration-300"
              >
                <Chrome size={16} />
                <span>GOOGLE</span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-zinc-800/50 hover:bg-zinc-800 text-white border border-white/5 transition-all duration-300"
              >
                <Apple size={16} />
                <span>APPLE</span>
              </button>
            </div>
          </div>

          <div className="text-center mt-8 space-y-4">
            <p className="text-zinc-500 text-xs">
              Want to sell your own drops?{" "}
              <button
                onClick={() => router.push("/create-store")}
                className="text-white font-black hover:underline underline-offset-4 cursor-pointer"
              >
                CREATE A STORE
              </button>
            </p>

            <div className="pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  if (lastVisitedStore) {
                    router.push(`/shop/${lastVisitedStore}/login`);
                  } else {
                    router.push("/");
                  }
                }}
                className="text-[10px] font-black text-zinc-500 hover:text-purple-400 tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <ShoppingBag size={12} />
                {lastVisitedStore ? "Continue to Shop" : "Visit the Marketplace"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
