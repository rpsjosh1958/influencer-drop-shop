"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { db } from "@/lib/firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  limit,
  where,
  getDocs,
  getDoc,
} from "firebase/firestore";
import {
  Loader2,
  ArrowUpRight,
  Wallet,
  History,
  AlertCircle,
  Download,
  Zap,
  CalendarClock,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { generateFinancePDF } from "@/lib/pdf-generator";
import { generateFinanceExcel } from "@/lib/excel-generator";
import { HelpTrigger } from "@/context/onboarding-context";
import { formatCurrency, toJsDate } from "@/lib/utils";
import type { StoreConfig, FirestoreTimestampLike } from "@/types";
import { LoadingState } from "@/components/admin/loading-state";
import { EmptyState } from "@/components/admin/empty-state";

interface WalletTransaction {
  id: string;
  type: "credit" | "debit" | "payout";
  amount: number;
  description: string;
  status: string;
  source?: "subaccount_split" | "internal_ledger";
  createdAt: FirestoreTimestampLike;
}

export default function FinancePage() {
  const { storeId, userPlan, loading: storeLoading } = useAdminStore();

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  // Fetch Store Config
  useEffect(() => {
    if (!storeId) return;
    getDoc(doc(db, "stores", storeId)).then((snap) => {
      if (snap.exists())
        setStoreConfig({ id: snap.id, ...snap.data() } as StoreConfig);
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
      })) as WalletTransaction[];

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
      })) as WalletTransaction[];

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

  // Wallet — no on-page action ever mutates this (it's written by Cloud
  // Functions/webhooks elsewhere), so a short poll interval is used instead
  // of onSnapshot to keep the balance from going stale without an open
  // realtime listener.
  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", storeId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "stores", storeId!, "wallet", "main"));
      return snap.exists()
        ? snap.data()
        : { currentBalance: 0, pendingBalance: 0, totalEarned: 0 };
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  // Recent Settlements — credits only. Without this filter, failed payout
  // attempts (from the now-removed withdrawal feature, or any future manual
  // adjustment) drown out actual earnings in this list.
  const { data: transactions = [] } = useQuery({
    queryKey: ["wallet_transactions", storeId],
    queryFn: async () => {
      const q = query(
        collection(db, "stores", storeId!, "wallet_transactions"),
        where("type", "==", "credit"),
        orderBy("createdAt", "desc"),
        limit(10),
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as WalletTransaction[];
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  // This month's earnings — a more immediate, actionable number than
  // lifetime Total Earned, since there's no "current balance" anymore.
  const { data: monthEarned = 0 } = useQuery({
    queryKey: ["wallet_transactions_month", storeId],
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const qMonth = query(
        collection(db, "stores", storeId!, "wallet_transactions"),
        where("type", "==", "credit"),
        where("createdAt", ">=", monthStart),
      );
      const snapshot = await getDocs(qMonth);
      return snapshot.docs.reduce(
        (total, d) => total + (d.data().amount || 0),
        0,
      );
    },
    enabled: !!storeId,
    refetchInterval: 30000,
  });

  if (storeLoading || walletLoading || !wallet) {
    return <LoadingState />;
  }


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

  const hasSubaccount = !!storeConfig?.payoutConfig?.subaccountCode;
  const payout = storeConfig?.payoutConfig;
  const maskedAccount = payout?.accountNumber
    ? `••••${String(payout.accountNumber).slice(-3)}`
    : "";

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            Finance & Payouts
            <HelpTrigger category="finance" />
          </h1>
          <p className="text-zinc-500">Track your earnings.</p>
        </div>
        {hasSubaccount ? (
          <Link
            href="/admin/settings?tab=payouts"
            data-tour="finance-payout-method"
            className="bg-white border border-zinc-200 px-5 py-3 rounded-xl font-bold hover:border-zinc-300 transition-colors flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <Wallet size={14} className="text-zinc-600" />
            </div>
            <div className="text-left">
              <p className="text-xs text-zinc-400 font-medium leading-none mb-1">
                Payout method
              </p>
              <p className="text-sm text-zinc-900 leading-none">
                {payout?.bankName || "Not set"}
                {maskedAccount && ` ${maskedAccount}`}
              </p>
            </div>
            <span className="text-xs font-bold text-zinc-400 group-hover:text-zinc-900 transition-colors ml-1">
              Change
            </span>
          </Link>
        ) : null}
      </div>

      {!hasSubaccount && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3 text-red-800">
          <AlertCircle className="shrink-0" size={20} />
          <div className="text-sm font-medium flex-1">
            Your store can't accept orders yet — link a payout method to get
            started.
          </div>
          <Link
            href="/admin/settings?tab=payouts"
            className="text-sm font-bold underline whitespace-nowrap flex items-center gap-1"
          >
            <Settings2 size={14} /> Set up payouts
          </Link>
        </div>
      )}

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
        <div className="bg-zinc-900 text-white p-8 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
              <CalendarClock size={12} /> Settlement
            </p>
            {hasSubaccount ? (
              <>
                <h2 className="text-2xl font-black tracking-tight leading-tight">
                  Auto-settles to{" "}
                  {payout?.provider === "momo"
                    ? payout?.bankName
                    : payout?.bankName || "your bank"}
                </h2>
                <p className="text-zinc-400 text-sm mt-2 font-medium">
                  {maskedAccount && `Account ${maskedAccount} • `}Paystack
                  pays this out on its normal settlement schedule — no
                  action needed.
                </p>
              </>
            ) : (
              <h2 className="text-2xl font-black tracking-tight leading-tight text-zinc-500">
                Not set up yet
              </h2>
            )}
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-zinc-800 rounded-full blur-3xl opacity-50" />
        </div>

        {userPlan !== "growth" && wallet.pendingBalance > 0 && (
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
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-2">This Month</p>
          <h2 className="text-3xl font-black tracking-tight text-green-600">
            {formatCurrency(monthEarned)}
          </h2>
          <p className="text-[10px] text-zinc-400 mt-2 font-medium">
            Earned since the 1st, auto-settling via Paystack.
          </p>
        </div>

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
          <History size={20} /> Recent Settlements
        </h3>

        <div className="space-y-4">
          {transactions.length === 0 ? (
            <EmptyState
              icon={History}
              title="No transactions yet"
              description="Earnings from verified sales will show up here."
            />
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
                    <p className="font-bold text-zinc-900 flex items-center gap-2">
                      {tx.description}
                      {tx.source === "subaccount_split" && (
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          Auto-settled
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {toJsDate(tx.createdAt)?.toLocaleDateString()} •{" "}
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
    </div>
  );
}
