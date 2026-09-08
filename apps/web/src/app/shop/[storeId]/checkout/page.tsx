"use client";

import { useCart } from "@/components/shop/cart-provider";
import { useStore } from "@/components/shop/store-provider";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { usePaystackPayment } from "react-paystack";
import { auth, db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Loader2,
  ShieldCheck,
  Truck,
  MapPin,
  Plus,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import type { CartItem } from "@/components/shop/cart-provider";

interface InitializeOrderPaymentResult {
  reference: string;
  amount: number; // pesewas
  access_code?: string;
}

interface Address {
  id: string;
  country: string;
  city: string;
  zip: string;
  street: string;
  isDefault: boolean;
}

const COUNTRIES = ["Ghana", "Nigeria", "United States", "United Kingdom"];
const CITIES: Record<string, string[]> = {
  Ghana: ["Accra", "Kumasi", "Tamale", "Takoradi"],
  Nigeria: ["Lagos", "Abuja", "Port Harcourt"],
  "United States": ["New York", "Los Angeles", "Chicago"],
  "United Kingdom": ["London", "Manchester", "Birmingham"],
};

export default function CheckoutPage() {
  const { cart, total, clearCart } = useCart();
  const { store } = useStore();
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // User Profile Data
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("new");

  // Form State
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [phone, setPhone] = useState("");

  const [country, setCountry] = useState("Ghana");
  const [city, setCity] = useState("Accra");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");

  useEffect(() => {
    setMounted(true);
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setEmail(u.email || "");
        setName(u.displayName || "");

        // Fetch Profile
        try {
          const docRef = doc(db, "users", u.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setPhone(data.phone || "");
            const addrs = data.addresses || [];
            setSavedAddresses(addrs);

            // Pre-select default
            const def = addrs.find((a: Address) => a.isDefault);
            if (def) {
              fillAddress(def);
              setSelectedAddressId(def.id);
            } else if (addrs.length > 0) {
              fillAddress(addrs[0]);
              setSelectedAddressId(addrs[0].id);
            }
          }
        } catch (e) {
          console.error("Failed to load profile", e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const fillAddress = (addr: Address) => {
    setCountry(addr.country);
    setCity(addr.city);
    setStreet(addr.street);
    setZip(addr.zip);
  };

  const handleAddressSelect = (id: string) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setCountry("Ghana");
      setCity("Accra");
      setStreet("");
      setZip("");
    } else {
      const addr = savedAddresses.find((a) => a.id === id);
      if (addr) fillAddress(addr);
    }
  };

  // Paystack Config — email/amount/reference are overridden per-call with
  // server-issued values from initializeOrderPayment (see handlePaymentStart);
  // this hook config only needs the static publicKey/currency.
  const config = {
    email: user?.email || email,
    amount: total * 100,
    publicKey:
      process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
      "pk_test_a0a57464670081d486241b2123ba3f42193b2a0c",
    currency: "GHS",
  };

  const initializePayment = usePaystackPayment(config);

  // Stock is reserved/released server-side now (initializeOrderPayment /
  // cancelOrderPayment) — this fixes variant-product checkout, which the
  // old client-side transaction could never do correctly: Firestore rules
  // only ever allowed a public write to `stock`, not `variants`, so any
  // variant purchase was silently rejected.
  const pendingReferenceRef = useRef<string | null>(null);

  const handlePaystackSuccess = async (
    reference: string | { reference: string },
  ) => {
    setLoading(true);
    try {
      // Never trust the client-side popup's success alone — confirm
      // server-side (verifies against Paystack and only then creates the
      // order) before showing the success screen.
      const confirmOrderPayment = httpsCallable(functions, "confirmOrderPayment");
      const ref =
        typeof reference === "string" ? reference : reference?.reference;
      await confirmOrderPayment({ reference: ref });
      pendingReferenceRef.current = null;

      clearCart();
      setShowSuccess(true);
    } catch (error) {
      console.error("Error confirming order:", error);
      alert(
        "We couldn't confirm your payment. If you were charged, please contact support with your reference.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackClose = () => {
    console.log("Payment closed/cancelled");
    if (pendingReferenceRef.current) {
      const cancelOrderPayment = httpsCallable(functions, "cancelOrderPayment");
      cancelOrderPayment({ reference: pendingReferenceRef.current }).catch(
        (err) => console.error("Failed to release stock on cancel", err),
      );
      pendingReferenceRef.current = null;
    }
    setLoading(false);
  };

  const handlePaymentStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const storeId = Array.isArray(params?.storeId)
      ? params.storeId[0]
      : (params?.storeId as string) || "default-store";

    // Recomputes the total server-side and reserves stock atomically
    // (including variant stock) — never trust the client's own `total`.
    try {
      const initializeOrderPayment = httpsCallable<
        unknown,
        InitializeOrderPaymentResult
      >(functions, "initializeOrderPayment");
      const safeItems: CartItem[] = JSON.parse(JSON.stringify(cart));
      const { data } = await initializeOrderPayment({
        storeId,
        items: safeItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          imageUrl: item.imageUrl,
          selectedVariant: item.selectedVariant || null,
        })),
        shipping: {
          fullName: name,
          email,
          phone,
          address: `${street}, ${city}, ${country} ${zip}`,
          country,
          city,
          street,
          zip,
        },
        customerNote,
        guestEmail: email,
      });

      // Stock is now reserved server-side — remember the reference so
      // handlePaystackClose can release it if the customer backs out.
      pendingReferenceRef.current = data.reference;

      // Open Payment Modal with the server-issued reference/amount
      initializePayment({
        config: {
          reference: data.reference,
          email,
          amount: data.amount, // pesewas, from the server
        },
        onSuccess: handlePaystackSuccess,
        onClose: handlePaystackClose,
      });
    } catch (error) {
      // initializeOrderPayment already releases any reservation it made
      // before throwing (e.g. Paystack init failed) — nothing to release here.
      console.error("Order initialization error", error);
      setLoading(false);
      alert(
        getErrorMessage(error) ||
          "Couldn't start checkout for this store. Please try again.",
      );
    }
  };

  if (loading || !mounted)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (cart.length === 0 && !showSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Your bag is empty.</h1>
        <Link
          href={`/shop/${
            (Array.isArray(params?.storeId)
              ? params.storeId[0]
              : (params?.storeId as string)) || "default-store"
          }`}
          className="underline font-medium"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-8">
        <Link
          href={`/shop/${
            (Array.isArray(params?.storeId)
              ? params.storeId[0]
              : (params?.storeId as string)) || "default-store"
          }`}
          className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-black transition-colors"
        >
          <ArrowLeft size={16} /> Back to Shop
        </Link>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left: Summary */}
        <div className="order-2 lg:order-1">
          <h2 className="text-xl font-black tracking-tight mb-6">
            ORDER SUMMARY
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.selectedVariant?.id || "base"}`}
                className="flex justify-between items-center text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold bg-zinc-100 w-6 h-6 flex items-center justify-center rounded-full text-xs">
                    {item.quantity}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold">{item.name}</span>
                    {item.selectedVariant && (
                      <span className="text-xs text-zinc-500 font-medium">
                        {item.selectedVariant.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-medium">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t border-zinc-100 pt-4 mt-4 flex justify-between items-center font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Right: Form */}
        <div className="order-1 lg:order-2">
          <h2 className="text-xl font-black tracking-tight mb-6">
            SHIPPING INFO
          </h2>
          <form onSubmit={handlePaymentStart} className="space-y-6">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase text-zinc-400">
                Contact
              </h3>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 rounded-xl border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-black"
                placeholder="Email"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-black"
                  placeholder="Full Name"
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-black"
                  placeholder="054..."
                />
              </div>
            </div>

            {/* Address Selection */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-zinc-400">
                  Address
                </h3>
                {savedAddresses.length > 0 && (
                  <div
                    className="text-xs text-blue-600 font-bold cursor-pointer"
                    onClick={() => handleAddressSelect("new")}
                  >
                    Use New Address
                  </div>
                )}
              </div>

              {savedAddresses.length > 0 && (
                <div className="grid grid-cols-1 gap-2">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => handleAddressSelect(addr.id)}
                      className={`p-3 border rounded-xl cursor-pointer flex items-center gap-3 transition-all ${
                        selectedAddressId === addr.id
                          ? "border-black bg-zinc-50 ring-1 ring-black"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selectedAddressId === addr.id
                            ? "border-black"
                            : "border-zinc-300"
                        }`}
                      >
                        {selectedAddressId === addr.id && (
                          <div className="w-2 h-2 bg-black rounded-full" />
                        )}
                      </div>
                      <div className="text-sm">
                        <div className="font-bold flex items-center gap-2">
                          {addr.city}, {addr.country}
                          {addr.isDefault && (
                            <span className="bg-zinc-200 text-[10px] px-1.5 rounded text-zinc-600">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-zinc-500 text-xs truncate">
                          {addr.street}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => handleAddressSelect("new")}
                    className={`p-3 border rounded-xl cursor-pointer flex items-center gap-3 transition-all ${
                      selectedAddressId === "new"
                        ? "border-black bg-zinc-50 ring-1 ring-black"
                        : "border-zinc-200 hover:border-zinc-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        selectedAddressId === "new"
                          ? "border-black"
                          : "border-zinc-300"
                      }`}
                    >
                      {selectedAddressId === "new" && (
                        <div className="w-2 h-2 bg-black rounded-full" />
                      )}
                    </div>
                    <div className="text-sm font-bold flex items-center gap-2">
                      <Plus size={14} /> New Address
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Address Fields */}
              <div
                className={`space-y-4 ${
                  selectedAddressId !== "new" &&
                  "opacity-50 pointer-events-none"
                }`}
              >
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setCity(CITIES[e.target.value]?.[0] || "");
                    }}
                    className="w-full bg-white border border-zinc-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all appearance-none"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-white border border-zinc-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all appearance-none"
                  >
                    {CITIES[country]?.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Street Address"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full bg-white border border-zinc-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
                <input
                  type="text"
                  placeholder="Zip / Digital Address (Optional)"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="w-full bg-white border border-zinc-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all"
                />
              </div>
            </div>

            {/* Customer Note */}
            <div className="space-y-4 pt-4 border-t border-zinc-100">
              <h3 className="text-xs font-bold uppercase text-zinc-400">
                Order Note (Optional)
              </h3>
              <textarea
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="Any special instructions..."
                rows={3}
                className="w-full p-3 rounded-xl border border-zinc-200 bg-white outline-none focus:ring-2 focus:ring-black transition-all resize-none"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3 mt-6">
              <ShieldCheck className="text-blue-600 flex-shrink-0" size={20} />
              <p className="text-xs text-blue-800 leading-relaxed">
                Payments are secured by Paystack. We do not store your card
                details. Delivery is usually within 2-3 business days.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg tracking-wide hover:bg-zinc-900 shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 mt-4"
            >
              <Truck size={20} />
              PAY {formatCurrency(total)} NOW
            </button>
          </form>
        </div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="stroke-[3]" />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-2">
                Order Placed!
              </h2>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                Your order has been successfully placed.
              </p>
              <button
                onClick={() => {
                  const storeId = Array.isArray(params?.storeId)
                    ? params.storeId[0]
                    : (params?.storeId as string) || "default-store";
                  router.push(`/shop/${storeId}`);
                }}
                className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-transform"
              >
                Continue Shopping
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
