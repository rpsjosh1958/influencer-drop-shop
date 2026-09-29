"use client";

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DiscountCode } from "@/types";
import { Plus, Trash2, TicketPercent, AlertCircle, Loader2, Copy, Info } from "lucide-react";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { LoadingState } from "@/components/admin/loading-state";
import { EmptyState } from "@/components/admin/empty-state";
import { describeDiscount, toJsDate } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

const EMPTY_FORM = {
  code: "",
  type: "percent" as DiscountCode["type"],
  value: "",
  minOrder: "",
  maxUses: "",
  expiresOn: "", // yyyy-mm-dd from <input type="date">
};

const inputClass =
  "w-full p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl outline-none focus:ring-2 ring-black";
const labelClass = "text-xs font-bold uppercase text-zinc-400 mb-1 block";

// Label with a tap-to-toggle "i". The explanation renders under the input
// (not the label) so side-by-side fields keep their inputs lined up.
function InfoField({
  label,
  info,
  children,
}: {
  label: string;
  info: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className={`${labelClass} flex items-center gap-1`}>
        {label}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={`What is ${label}?`}
          aria-expanded={open}
          className="text-zinc-400 hover:text-black dark:hover:text-white"
        >
          <Info size={13} />
        </button>
      </div>
      {children}
      {open && (
        <p className="text-[11px] leading-snug text-zinc-500 mt-1.5">{info}</p>
      )}
    </div>
  );
}

// Codes are the doc id, so they're unique per store. Checkout validates and
// applies them server-side (functions/src/discounts.ts) — this page only
// manages them.
export default function DiscountsPage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  // Read once per visit, for the "Expired" labels — not worth a ticking clock.
  const [now] = useState(() => Date.now());
  const set = (field: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const { data: codes = [], isLoading: loading } = useQuery({
    queryKey: ["discountCodes", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const snapshot = await getDocs(
        query(
          collection(db, "stores", storeId, "discount_codes"),
          orderBy("createdAt", "desc"),
        ),
      );
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as DiscountCode[];
    },
    enabled: !!storeId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["discountCodes", storeId] });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!storeId) return;
      const code = form.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const value = Number(form.value);
      if (code.length < 3 || code.length > 20) {
        throw new Error("Codes are 3–20 letters or numbers.");
      }
      if (!(value > 0) || (form.type === "percent" && value > 100)) {
        throw new Error(
          form.type === "percent"
            ? "Percent off must be between 1 and 100."
            : "Amount off must be more than 0.",
        );
      }
      const ref = doc(db, "stores", storeId, "discount_codes", code);
      if ((await getDoc(ref)).exists()) {
        throw new Error(`${code} already exists.`);
      }
      await setDoc(ref, {
        type: form.type,
        value,
        active: true,
        minOrder: Number(form.minOrder) > 0 ? Number(form.minOrder) : null,
        maxUses: Number(form.maxUses) > 0 ? Math.floor(Number(form.maxUses)) : null,
        usedCount: 0,
        // End of the chosen day, in the vendor's timezone.
        expiresAt: form.expiresOn
          ? Timestamp.fromDate(new Date(`${form.expiresOn}T23:59:59`))
          : null,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      invalidate();
      setForm(EMPTY_FORM);
    },
    onError: (e) => alert(getErrorMessage(e) || "Failed to create code"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (d: DiscountCode) => {
      if (!storeId) return;
      await updateDoc(doc(db, "stores", storeId, "discount_codes", d.id), {
        active: !d.active,
      });
    },
    onSuccess: invalidate,
    onError: () => alert("Failed to update code"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!storeId) return;
      await deleteDoc(doc(db, "stores", storeId, "discount_codes", id));
    },
    onSuccess: invalidate,
    onError: () => alert("Failed to delete code"),
  });

  if (storeLoading) return <LoadingState />;

  if (!storeId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <AlertCircle size={48} className="text-zinc-300 mb-4" />
        <h3 className="font-bold text-lg mb-2">No Store Selection</h3>
        <p className="text-zinc-500 max-w-md">
          Please select a store from the dashboard to manage discount codes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Discount Codes"
        subtitle="Codes customers enter at checkout. The discount comes off your share of the sale."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Form */}
        <div className="lg:col-span-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addMutation.mutate();
            }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 sticky top-8 space-y-4"
          >
            <h2 className="font-bold">New Code</h2>
            <div>
              <label className={labelClass}>Code</label>
              <input
                value={form.code}
                onChange={set("code")}
                placeholder="e.g. DROP20"
                maxLength={20}
                required
                className={`${inputClass} uppercase font-mono tracking-widest`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Type</label>
                <select value={form.type} onChange={set("type")} className={inputClass}>
                  <option value="percent">% off</option>
                  <option value="fixed">GHS off</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {form.type === "percent" ? "Percent" : "Amount (GHS)"}
                </label>
                <input
                  type="number"
                  min={0}
                  max={form.type === "percent" ? 100 : undefined}
                  step="any"
                  value={form.value}
                  onChange={set("value")}
                  required
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Min order (GHS)"
                info="The order subtotal must be at least this much for the code to work. Leave blank to allow any order size."
              >
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={form.minOrder}
                  onChange={set("minOrder")}
                  placeholder="None"
                  className={inputClass}
                />
              </InfoField>
              <InfoField
                label="Max uses"
                info="How many paid orders can use this code in total, across all customers. Leave blank for unlimited. Applying the code or closing the payment popup doesn't use it up."
              >
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.maxUses}
                  onChange={set("maxUses")}
                  placeholder="Unlimited"
                  className={inputClass}
                />
              </InfoField>
            </div>
            <div>
              <label className={labelClass}>Expires (optional)</label>
              <input
                type="date"
                value={form.expiresOn}
                onChange={set("expiresOn")}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {addMutation.isPending ? (
                "Creating..."
              ) : (
                <>
                  <Plus size={18} /> Create Code
                </>
              )}
            </button>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-zinc-400" size={24} />
            </div>
          ) : codes.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
              <EmptyState
                icon={TicketPercent}
                title="No discount codes yet"
                description="Create one and share it with your customers."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((d) => {
                const expires = toJsDate(d.expiresAt);
                const expired = !!expires && expires.getTime() < now;
                const usedUp = !!d.maxUses && d.usedCount >= d.maxUses;
                const live = d.active && !expired && !usedUp;
                return (
                  <div
                    key={d.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl ${
                      live ? "" : "opacity-60"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-black tracking-widest">{d.id}</p>
                        <button
                          onClick={() => navigator.clipboard.writeText(d.id)}
                          className="p-1 text-zinc-400 hover:text-black dark:hover:text-white"
                          aria-label={`Copy ${d.id}`}
                        >
                          <Copy size={14} />
                        </button>
                        {!live && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                            {expired ? "Expired" : usedUp ? "Used up" : "Paused"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-300">
                        {describeDiscount(d)}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Used {d.usedCount || 0}
                        {d.maxUses ? ` / ${d.maxUses}` : ""}
                        {expires && ` · ${expired ? "Expired" : "Expires"} ${expires.toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleMutation.mutate(d)}
                        disabled={toggleMutation.isPending}
                        className="px-3 py-2 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {d.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${d.id}? Customers won't be able to use it.`)) {
                            deleteMutation.mutate(d.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                        aria-label={`Delete ${d.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
