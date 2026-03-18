"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { db, functions } from "@/lib/firebase";
import {
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  Loader2,
  ArrowUpRight,
  Wallet,
  History,
  AlertCircle,
  Download,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateFinancePDF } from "@/lib/pdf-generator";
import { generateFinanceExcel } from "@/lib/excel-generator";
import { HelpTrigger } from "@/context/onboarding-context";

export default function FinancePage() {
  const { storeId, userPlan, loading: storeLoading } = useAdminStore();

  // Wallet State
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdrawal State
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [storeConfig, setStoreConfig] = useState<any>(null);

  // Fetch Store Config
  useEffect(() => {
    if (!storeId) return;
    getDoc(doc(db, "stores", storeId)).then((snap) => {
      if (snap.exists()) setStoreConfig(snap.data());
    });
  }, [storeId]);

  const handleExportStatement = async () => {
    if (!storeConfig) return;
    setExporting(true);
    try {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const q = query(
        collection(db, "stores", storeId!, "wallet_transactions"),
        orderBy("createdAt", "desc"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
      );

      const snapshot = await getDocs(q);
      const periodTransactions = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      const totalEarnedPeriod = periodTransactions
        .filter((tx) => tx.type === "credit")
        .reduce((sum, tx) => sum + (tx.amount || 0), 0);

      const monthName = new Date(selectedYear, selectedMonth).toLocaleString(
        "default",
        { month: "long" },
      );

      generateFinancePDF(periodTransactions, {
        storeName: storeConfig.name,
        storeIcon: storeConfig.logo,
        month: monthName,
        year: selectedYear.toString(),
        totalEarned: totalEarnedPeriod,
        currency: "GHS",
      });

      setMessage({
        type: "success",
        text: `Statement for ${monthName} ${selectedYear} downloaded!`,
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to generate statement." });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!storeConfig) return;
    setExporting(true);
    try {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

      const q = query(
        collection(db, "stores", storeId!, "wallet_transactions"),
        orderBy("createdAt", "desc"),
        where("createdAt", ">=", start),
        where("createdAt", "<=", end),
      );

      const snapshot = await getDocs(q);
      const periodTransactions = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as any[];

      const monthName = new Date(selectedYear, selectedMonth).toLocaleString(
        "default",
        { month: "long" },
      );

      generateFinanceExcel(periodTransactions, {
        fileName: `finance-${monthName}-${selectedYear}.xlsx`,
        sheetName: `${monthName} ${selectedYear}`,
      });

      setMessage({
        type: "success",
        text: `Excel Report for ${monthName} ${selectedYear} downloaded!`,
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Failed to generate Excel." });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!storeId) return;

    // 1. Realtime Wallet
    const unsubWallet = onSnapshot(
      doc(db, "stores", storeId, "wallet", "main"),
      (doc) => {
        if (doc.exists()) {
          setWallet(doc.data());
        } else {
          setWallet({ currentBalance: 0, pendingBalance: 0, totalEarned: 0 });
        }
        setLoading(false);
      },
    );

    // 2. Recent Transactions
    const q = query(
      collection(db, "stores", storeId, "wallet_transactions"),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    const unsubTx = onSnapshot(q, (snapshot) => {
      setTransactions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [storeId]);

  const handleWithdraw = async () => {
    if (!amount || isNaN(parseFloat(amount))) return;
    setProcessing(true);
    setMessage(null);

    try {
      const withdrawFn = httpsCallable(functions, "initiateWithdrawal");
      const result: any = await withdrawFn({
        storeId,
        amount: parseFloat(amount),
      });

      if (result.data.success) {
        setMessage({
          type: "success",
          text: "Withdrawal Initiated! Funds are on the way.",
        });
        setShowWithdraw(false);
        setAmount("");
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Withdrawal failed." });
    } finally {
      setProcessing(false);
    }
  };

  if (storeLoading || loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(val || 0);
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Finance & Payouts
            <HelpTrigger category="finance" />
          </h1>
          <p className="text-zinc-500">Track your earnings and cash out.</p>
        </div>
        <button
          data-tour="finance-withdraw"
          onClick={() => setShowWithdraw(true)}
          disabled={!wallet || wallet.currentBalance < 10}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 shadow-lg"
        >
          <ArrowUpRight size={20} />
          Withdraw Funds
        </button>
      </div>

      {/* Reports Section */}
      <div
        data-tour="finance-statements"
        className="bg-white p-6 rounded-3xl border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h3 className="font-bold text-lg text-black">Monthly Statements</h3>
          <p className="text-sm text-zinc-500">
            Download PDF reports for your financial records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="h-10 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-black text-sm font-medium outline-none focus:ring-2 focus:ring-black flex-1 md:flex-none min-w-[100px]"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-10 px-3 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-black font-medium outline-none focus:ring-2 focus:ring-black flex-1 md:flex-none min-w-[80px]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportStatement}
            disabled={exporting}
            className="h-10 px-4 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 flex-1 md:flex-none justify-center whitespace-nowrap"
          >
            {exporting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-10 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 flex-1 md:flex-none justify-center whitespace-nowrap"
          >
            {exporting ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Download size={16} />
            )}
            Excel
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <strong>{message.type === "success" ? "Success:" : "Error:"}</strong>{" "}
          {message.text}
        </div>
      )}

      {/* Balance Cards */}
      <div
        data-tour="finance-balance"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-zinc-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl shadow-zinc-200">
          <div className="relative z-10">
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
              <Wallet size={12} /> Available Balance
            </p>
            <h2 className="text-4xl font-black tracking-tight">
              {formatCurrency(wallet.currentBalance)}
            </h2>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-zinc-800 rounded-full blur-3xl opacity-50" />
        </div>

        {userPlan !== "growth" && (
          <div className="bg-white border border-zinc-200 p-8 rounded-3xl group hover:border-zinc-300 transition-colors">
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Pending (T+2)</p>
            <h2 className="text-3xl font-black tracking-tight text-zinc-400">
              {formatCurrency(wallet.pendingBalance)}
            </h2>
            <p className="text-[10px] text-zinc-400 mt-2 font-medium">
              Funds clear 48h after delivery (Starter Plan).
            </p>
          </div>
        )}

        <div className="bg-white border border-zinc-200 p-8 rounded-3xl group hover:border-zinc-300 transition-colors">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">Total Earned</p>
          <h2 className="text-3xl font-black tracking-tight text-green-600">
            {formatCurrency(wallet.totalEarned)}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-2 font-medium">
            Lifetime earnings on this store.
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div
        data-tour="finance-transactions"
        className="bg-white border border-zinc-200 rounded-3xl p-8"
      >
        <h3 className="text-xl font-bold mb-6 text-black flex items-center gap-2">
          <History size={20} /> Recent Transactions
        </h3>

        <div className="space-y-4">
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-zinc-400">
              No transactions yet.
            </div>
          ) : (
            transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === "credit"
                        ? "bg-green-100 text-green-600"
                        : tx.type === "debit" || tx.type === "payout"
                          ? "bg-red-100 text-red-600"
                          : "bg-gray-100"
                    }`}
                  >
                    {tx.type === "credit" ? (
                      <ArrowUpRight className="rotate-180" size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900">{tx.description}</p>
                    <p className="text-xs text-zinc-500">
                      {tx.createdAt?.toDate().toLocaleDateString()} •{" "}
                      {tx.status}
                    </p>
                  </div>
                </div>
                <div
                  className={`font-black ${
                    tx.type === "credit" ? "text-green-600" : "text-zinc-900"
                  }`}
                >
                  {tx.type === "credit" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl space-y-6"
            >
              <div>
                <h2 className="text-2xl text-black font-bold">Cash Out</h2>
                <p className="text-zinc-500">Enter amount to withdraw.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold block mb-2">
                    Amount (GHS)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-3xl font-bold text-black p-4 bg-zinc-50 rounded-2xl border border-zinc-200 outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-right text-xs font-bold text-zinc-400 mt-2">
                    Max: {formatCurrency(wallet.currentBalance)}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-blue-800 text-sm">
                  <AlertCircle className="shrink-0" size={20} />
                  <p>
                    Transfers are processed instantly via Paystack. Charges may
                    apply.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 py-4 font-bold text-zinc-500 hover:bg-zinc-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={
                      processing ||
                      !amount ||
                      parseFloat(amount) > wallet.currentBalance
                    }
                    className="flex-1 py-4 bg-black text-white rounded-xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="animate-spin mx-auto" />
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
