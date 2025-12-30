"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export default function AuthActionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");
  const userType = searchParams.get("type"); // 'admin' or 'customer'
  const storeId = searchParams.get("storeId"); // For customers

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Validate Code on Mount
  useEffect(() => {
    if (!oobCode) {
      setError("Invalid or missing reset code.");
      setVerifying(false);
      return;
    }

    if (mode === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => {
          setEmail(email);
          setVerifying(false);
        })
        .catch((e) => {
          console.error(e);
          setError("This link has expired or has already been used.");
          setVerifying(false);
        });
    } else {
      // Handle other modes if needed (verifyEmail etc), for now just error
      setError("Invalid action mode.");
      setVerifying(false);
    }
  }, [oobCode, mode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!oobCode) return;

    setLoading(true);
    setError("");

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const loginLink =
    userType === "customer" && storeId ? `/shop/${storeId}/login` : "/admin";
  const loginLabel =
    userType === "customer" ? "Go to Shop Login" : "Go to Admin Login";

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h1 className="text-xl font-bold">Link Expired</h1>
          <p className="text-zinc-500">{error}</p>
          <Link
            href={loginLink}
            className="inline-block pt-4 font-bold hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="text-green-600" size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-black">Password Reset</h1>
            <p className="text-zinc-500 mt-2">
              Your password has been successfully updated.
            </p>
          </div>
          <Link
            href={loginLink}
            className="block w-full py-4 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform"
          >
            {loginLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl space-y-8">
        <div className="text-center">
          <h1 className="text-2xl text-white font-black tracking-tight">New Password</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Setting new password for{" "}
            <span className="font-bold text-black dark:text-white">
              {email}
            </span>
          </p>
        </div>

        <form onSubmit={handleReset} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-500">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-zinc-50 text-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium pr-12"
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-zinc-500">
                Confirm Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-4 text-white bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center disabled:opacity-70 disabled:hover:scale-100"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
