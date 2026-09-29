import { useState } from "react";
import { View, ScrollView, Pressable, TextInput, ActivityIndicator, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "expo-router/react-navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Menu, Plus, Share2, Trash2, Info, TicketPercent } from "lucide-react-native";
import { useVendor } from "@/context/vendor-context";
import { useAlert } from "@/context/alert-context";
import { H1, P } from "@/components/ui/text";
import { formatCurrency } from "@/lib/format";
import { getErrorMessage } from "@/lib/errors";
import type { FirestoreTimestamp } from "@/types";

// Mirrors apps/web's /admin/discounts. stores/{storeId}/discount_codes/{CODE}
// — the doc id is the code. Checkout validates and applies codes
// server-side (functions/src/discounts.ts); this screen only manages them.
interface DiscountCode {
  id: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: FirestoreTimestamp | null;
}

const EMPTY_FORM = {
  code: "",
  type: "percent" as DiscountCode["type"],
  value: "",
  minOrder: "",
  maxUses: "",
  expiresInDays: "", // no date picker installed — days from today instead
};

const describe = (d: DiscountCode) => {
  const off = d.type === "percent" ? `${d.value}% off` : `${formatCurrency(d.value)} off`;
  return d.minOrder ? `${off} orders over ${formatCurrency(d.minOrder)}` : off;
};

const formatDate = (ts: FirestoreTimestamp) =>
  new Date(ts.seconds * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const inputClass = "bg-zinc-50 border border-zinc-100 rounded-xl px-4 h-12 font-medium text-base text-black";

function Field({ label, info, children }: { label: string; info?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1 mb-1.5">
        <P className="text-[11px] font-bold uppercase text-zinc-400">{label}</P>
        {info && (
          <Pressable onPress={() => setOpen((o) => !o)} hitSlop={10} accessibilityLabel={`What is ${label}?`}>
            <Info size={13} color="#a1a1aa" />
          </Pressable>
        )}
      </View>
      {children}
      {open && <P className="text-[11px] leading-4 text-zinc-500 mt-1.5">{info}</P>}
    </View>
  );
}

export default function DiscountsScreen() {
  const navigation = useNavigation();
  const { store } = useVendor();
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const storeId = store?.id;
  const [form, setForm] = useState(EMPTY_FORM);
  // Read once per visit for the "Expired" labels.
  const [now] = useState(() => Date.now());
  const set = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["discountCodes", storeId],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, "stores", storeId!, "discount_codes"), orderBy("createdAt", "desc"))
      );
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as DiscountCode[];
    },
    enabled: !!storeId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["discountCodes", storeId] });

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
          form.type === "percent" ? "Percent off must be between 1 and 100." : "Amount off must be more than 0."
        );
      }
      const ref = doc(db, "stores", storeId, "discount_codes", code);
      if ((await getDoc(ref)).exists()) throw new Error(`${code} already exists.`);

      const days = Math.floor(Number(form.expiresInDays));
      let expiresAt: Timestamp | null = null;
      if (days > 0) {
        const end = new Date();
        end.setDate(end.getDate() + days);
        end.setHours(23, 59, 59, 0);
        expiresAt = Timestamp.fromDate(end);
      }

      await setDoc(ref, {
        type: form.type,
        value,
        active: true,
        minOrder: Number(form.minOrder) > 0 ? Number(form.minOrder) : null,
        maxUses: Number(form.maxUses) > 0 ? Math.floor(Number(form.maxUses)) : null,
        usedCount: 0,
        expiresAt,
        createdAt: serverTimestamp(),
      });
    },
    onSuccess: () => {
      invalidate();
      setForm(EMPTY_FORM);
    },
    onError: (e) =>
      showAlert({ title: "Couldn't create code", message: getErrorMessage(e) || "Try again.", type: "error" }),
  });

  const toggleMutation = useMutation({
    mutationFn: (d: DiscountCode) =>
      updateDoc(doc(db, "stores", storeId!, "discount_codes", d.id), { active: !d.active }),
    onSuccess: invalidate,
    onError: () => showAlert({ title: "Couldn't update code", message: "Try again.", type: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, "stores", storeId!, "discount_codes", id)),
    onSuccess: invalidate,
    onError: () => showAlert({ title: "Couldn't delete code", message: "Try again.", type: "error" }),
  });

  // Same message as the web share modal's "Copy Message".
  const share = (d: DiscountCode) => {
    const headline = d.type === "percent" ? `${d.value}%` : `GHS ${d.value}`;
    const lines = [
      `${headline} off at ${store?.name} 🛍️`,
      `Use code ${d.id} at checkout.`,
      d.minOrder ? `On orders over GHS ${d.minOrder}` : null,
      d.expiresAt ? `Valid until ${formatDate(d.expiresAt)}` : null,
      `https://copdrop.io/shop/${storeId}`,
    ].filter(Boolean);
    Share.share({ message: lines.join("\n") });
  };

  const confirmDelete = (d: DiscountCode) =>
    showAlert({
      title: `Delete ${d.id}?`,
      message: "Customers won't be able to use it anymore.",
      type: "warning",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () => deleteMutation.mutate(d.id),
    });

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 bg-white flex-row items-center gap-3">
        <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Menu size={24} color="black" />
        </Pressable>
        <View>
          <H1 className="text-xl font-black uppercase">Discounts</H1>
          <P className="text-xs text-zinc-400 font-bold">Codes customers enter at checkout</P>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {/* New code */}
        <View className="bg-white rounded-3xl p-5 border border-zinc-100 gap-4">
          <P className="font-black text-base">New Code</P>
          <Field label="Code">
            <TextInput
              value={form.code}
              onChangeText={set("code")}
              placeholder="e.g. DROP20"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              className={`${inputClass} tracking-widest`}
              placeholderTextColor="#a1a1aa"
            />
          </Field>
          <View className="flex-row gap-3">
            <Field label="Type">
              <View className="flex-row bg-zinc-100 rounded-xl p-1 h-12">
                {(["percent", "fixed"] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => set("type")(t)}
                    className={`flex-1 items-center justify-center rounded-lg ${form.type === t ? "bg-white" : ""}`}
                  >
                    <P className={`text-xs font-bold ${form.type === t ? "text-black" : "text-zinc-500"}`}>
                      {t === "percent" ? "% off" : "GHS off"}
                    </P>
                  </Pressable>
                ))}
              </View>
            </Field>
            <Field label={form.type === "percent" ? "Percent" : "Amount (GHS)"}>
              <TextInput
                value={form.value}
                onChangeText={set("value")}
                keyboardType="decimal-pad"
                className={inputClass}
                placeholderTextColor="#a1a1aa"
              />
            </Field>
          </View>
          <View className="flex-row gap-3">
            <Field
              label="Min order (GHS)"
              info="The order subtotal must be at least this much for the code to work. Leave blank to allow any order size."
            >
              <TextInput
                value={form.minOrder}
                onChangeText={set("minOrder")}
                keyboardType="decimal-pad"
                placeholder="None"
                className={inputClass}
                placeholderTextColor="#a1a1aa"
              />
            </Field>
            <Field
              label="Max uses"
              info="How many paid orders can use this code in total, across all customers. Leave blank for unlimited. Applying the code or closing the payment popup doesn't use it up."
            >
              <TextInput
                value={form.maxUses}
                onChangeText={set("maxUses")}
                keyboardType="number-pad"
                placeholder="Unlimited"
                className={inputClass}
                placeholderTextColor="#a1a1aa"
              />
            </Field>
          </View>
          <Field label="Expires after (days)">
            <TextInput
              value={form.expiresInDays}
              onChangeText={set("expiresInDays")}
              keyboardType="number-pad"
              placeholder="Never"
              className={inputClass}
              placeholderTextColor="#a1a1aa"
            />
          </Field>
          <Pressable
            onPress={() => addMutation.mutate()}
            disabled={addMutation.isPending || !form.code || !form.value}
            className={`h-12 rounded-xl bg-black flex-row items-center justify-center gap-2 ${
              addMutation.isPending || !form.code || !form.value ? "opacity-40" : ""
            }`}
          >
            {addMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Plus size={18} color="white" />
                <P className="text-white font-bold">Create Code</P>
              </>
            )}
          </Pressable>
        </View>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator color="black" className="mt-6" />
        ) : codes.length === 0 ? (
          <View className="items-center py-10 gap-2">
            <TicketPercent size={32} color="#d4d4d8" />
            <P className="font-bold text-zinc-500">No discount codes yet</P>
            <P className="text-xs text-zinc-400">Create one and share it with your customers.</P>
          </View>
        ) : (
          codes.map((d) => {
            const expired = !!d.expiresAt && d.expiresAt.seconds * 1000 < now;
            const usedUp = !!d.maxUses && d.usedCount >= d.maxUses;
            const live = d.active && !expired && !usedUp;
            return (
              <View key={d.id} className={`bg-white rounded-2xl p-4 border border-zinc-100 ${live ? "" : "opacity-60"}`}>
                <View className="flex-row items-center gap-2">
                  <P className="font-black tracking-widest text-base">{d.id}</P>
                  {!live && (
                    <View className="bg-zinc-100 px-2 py-0.5 rounded-full">
                      <P className="text-[10px] font-black uppercase text-zinc-500">
                        {expired ? "Expired" : usedUp ? "Used up" : "Paused"}
                      </P>
                    </View>
                  )}
                </View>
                <P className="text-sm text-zinc-600 mt-0.5">{describe(d)}</P>
                <P className="text-xs text-zinc-400 mt-0.5">
                  Used {d.usedCount || 0}
                  {d.maxUses ? ` / ${d.maxUses}` : ""}
                  {d.expiresAt ? ` · ${expired ? "Expired" : "Expires"} ${formatDate(d.expiresAt)}` : ""}
                </P>
                <View className="flex-row gap-2 mt-3">
                  {live && (
                    <Pressable
                      onPress={() => share(d)}
                      className="flex-row items-center gap-1.5 px-3 h-9 rounded-lg bg-black"
                    >
                      <Share2 size={14} color="white" />
                      <P className="text-white text-xs font-bold">Share</P>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => toggleMutation.mutate(d)}
                    disabled={toggleMutation.isPending}
                    className="px-3 h-9 rounded-lg border border-zinc-200 items-center justify-center"
                  >
                    <P className="text-xs font-bold">{d.active ? "Pause" : "Resume"}</P>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(d)}
                    disabled={deleteMutation.isPending}
                    className="px-3 h-9 rounded-lg items-center justify-center ml-auto"
                    accessibilityLabel={`Delete ${d.id}`}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
