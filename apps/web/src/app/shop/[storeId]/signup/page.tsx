"use client";

import { useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { Country, City } from "country-state-city";
import { Combobox } from "@/components/ui/combobox";

// Helper to get formatted options
const countryOptions = Country.getAllCountries().map((country) => ({
  label: country.name,
  value: country.isoCode,
}));

// Helper to get city options for a country
const getCityOptions = (countryCode: string) => {
  if (!countryCode) return [];
  return (
    City.getCitiesOfCountry(countryCode)?.map((city) => ({
      label: city.name,
      value: city.name,
    })) || []
  );
};

export default function ShopSignup() {
  const router = useRouter();

  // Auth State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Personal Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Address State
  const [country, setCountry] = useState("GH"); // Default to Ghana ISO
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/");
      }
    });
    return () => unsub();
  }, [router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // 2. Update Profile Display Name
      await updateProfile(user, { displayName: fullName });

      // 3. Create User Document with Address
      const initialAddress = {
        id: Date.now().toString(),
        country,
        city,
        street,
        zip,
        isDefault: true,
      };

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        displayName: fullName,
        phone: phone,
        role: "customer",
        addresses: [initialAddress],
        createdAt: serverTimestamp(),
      });

      router.push("/");
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Email is already registered.");
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters.");
      } else {
        setError("Failed to create account. Please try again.");
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-black py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-tighter">
            JOIN THE DROP.
          </h1>
          <p className="text-zinc-500 mt-2">
            Create an account to secure your bag.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Identity */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase text-zinc-400">
              Identity
            </h3>
            <input
              type="text"
              placeholder="Full Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              />
              <input
                type="tel"
                placeholder="Phone"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
              />
              <p className="text-xs text-zinc-400 mt-2 ml-1">
                Must be at least 6 characters.
              </p>
            </div>
          </div>

          {/* Shipping */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-bold uppercase text-zinc-400">
              Shipping Address
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Combobox
                options={countryOptions}
                value={country}
                onChange={(val) => {
                  setCountry(val);
                  setCity(""); // Reset city
                }}
                placeholder="Select Country"
                searchPlaceholder="Search country..."
              />
              <Combobox
                options={getCityOptions(country)}
                value={city}
                onChange={(val) => setCity(val)}
                placeholder="Select City"
                searchPlaceholder="Search city..."
                disabled={!country}
              />
            </div>
            <input
              type="text"
              placeholder="Street Address"
              required
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
            <input
              type="text"
              placeholder="Zip / Digital Address (Optional)"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 rounded-xl font-bold tracking-wide hover:bg-zinc-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="animate-spin" /> : "CREATE ACCOUNT"}
          </button>
        </form>

        <p className="text-center text-zinc-500 text-sm">
          Already have an account? Already have an account?{" "}
          <button
            onClick={() => {
              const storeIdStr = window.location.pathname.split("/")[2];
              router.push(`/shop/${storeIdStr}/login`);
            }}
            className="text-black font-bold hover:underline"
          >
            Sign in
          </button>
        </p>
      </motion.div>
    </div>
  );
}
