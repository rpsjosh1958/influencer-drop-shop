import { View, ScrollView, Pressable, Linking, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { H1, P } from "@/components/ui/text";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  ArrowLeft,
  BadgeCheck,
  Zap,
  CheckCircle2,
  ExternalLink,
} from "lucide-react-native";
import type { FirestoreTimestamp } from "@/types";

// Mirrors functions/src/billing.ts's BILLING_PLANS — this screen is
// view-only reference info, actual charging happens server-side there.
const BILLING_PLANS = [
  { label: "Monthly", price: 250 },
  { label: "Quarterly (3 Months)", price: 700 },
  { label: "Annual (12 Months)", price: 2500 },
];

const GROWTH_FEATURES = [
  "Unlimited Stores (Pro Sync)",
  "2% Transaction Fee (Reduced from 8%)",
  "Verified Account Badge",
  "Full Brand Customization",
];

function getDaysLeft(planExpiresAt: FirestoreTimestamp | undefined) {
  if (!planExpiresAt?.seconds) return null;
  const expiryDate = new Date(planExpiresAt.seconds * 1000);
  const diff = expiryDate.getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return {
    days: days > 0 ? days : 0,
    date: expiryDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
}

export default function VendorBilling() {
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-billing", auth.currentUser?.uid],
    queryFn: async () => {
      const uid = auth.currentUser!.uid;
      const snap = await getDoc(doc(db, "users", uid));
      const userData = snap.exists() ? snap.data() : null;
      return {
        plan: (userData?.plan as string) || "starter",
        planExpiresAt: userData?.planExpiresAt as FirestoreTimestamp | undefined,
      };
    },
    enabled: !!auth.currentUser,
  });

  const plan = data?.plan || "starter";
  const isGrowth = plan === "growth";
  const expiryInfo = isGrowth ? getDaysLeft(data?.planExpiresAt) : null;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">Billing & Plan</H1>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="black" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, gap: 16 }}
        >
          {/* Current Plan */}
          <View className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm">
            <View className="flex-row items-center gap-2 mb-2">
              <P className="text-xl font-black">
                {isGrowth ? "Growth Plan" : "Starter Plan"}
              </P>
              {isGrowth && <BadgeCheck size={18} color="#2563eb" />}
            </View>

            {isGrowth && expiryInfo ? (
              <View className="mt-1">
                <P className="text-purple-600 font-bold text-sm">
                  Expires in {expiryInfo.days} days ({expiryInfo.date})
                </P>
                <P className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                  This plan covers all your stores. If it expires, secondary
                  stores get locked and only your oldest store stays active.
                </P>
              </View>
            ) : (
              <P className="text-zinc-500 text-sm">
                The standard free plan for individual creators. One active
                store with basic features.
              </P>
            )}

            <View
              className={`self-start mt-4 px-3 py-1.5 rounded-full flex-row items-center gap-1.5 ${
                isGrowth ? "bg-black" : "bg-zinc-100 border border-zinc-200"
              }`}
            >
              {isGrowth && <Zap size={12} color="white" fill="white" />}
              <P
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isGrowth ? "text-white" : "text-zinc-500"
                }`}
              >
                {isGrowth ? "Active Pro" : "Starter"}
              </P>
            </View>
          </View>

          {/* Growth Plan Details */}
          <View className="bg-zinc-900 rounded-3xl p-6">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center">
                <Zap size={22} color="black" fill="black" />
              </View>
              <View>
                <P className="text-white text-lg font-black">Growth Plan</P>
                <P className="text-zinc-400 text-xs font-medium">
                  {formatCurrency(BILLING_PLANS[0].price)} / month
                </P>
              </View>
            </View>

            <View className="gap-2 mb-5">
              {GROWTH_FEATURES.map((item) => (
                <View key={item} className="flex-row items-center gap-2">
                  <CheckCircle2 size={16} color="white" />
                  <P className="text-zinc-300 text-sm font-medium">{item}</P>
                </View>
              ))}
            </View>

            <View className="gap-2 pt-4 border-t border-zinc-800">
              {BILLING_PLANS.map((p) => (
                <View
                  key={p.label}
                  className="flex-row items-center justify-between"
                >
                  <P className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                    {p.label}
                  </P>
                  <P className="text-white text-sm font-black">
                    {formatCurrency(p.price)}
                  </P>
                </View>
              ))}
            </View>
          </View>

          {/* Web handoff — billing changes are web-only */}
          <View className="bg-blue-50 p-4 rounded-2xl flex-row items-start gap-3">
            <Zap size={16} color="#2563eb" className="mt-0.5" />
            <P className="flex-1 text-blue-800 text-xs font-medium">
              {isGrowth
                ? "To extend your subscription, manage it from the Web Admin Dashboard."
                : "To upgrade to Growth, manage it from the Web Admin Dashboard."}
            </P>
          </View>

          <Pressable
            onPress={() =>
              Linking.openURL("https://copdrop.io/admin/settings?tab=billing")
            }
            className="w-full bg-black py-4 rounded-xl flex-row items-center justify-center gap-2 active:opacity-90 transition-opacity"
          >
            <P className="text-white font-bold uppercase">
              {isGrowth ? "Extend on Web Dashboard" : "Upgrade on Web Dashboard"}
            </P>
            <ExternalLink size={16} color="white" />
          </Pressable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
