import { View, ScrollView, Pressable, RefreshControl, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useVendor } from "@/context/vendor-context";
import { H1, P } from "@/components/ui/text";
import { formatCurrency } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Menu,
  Wallet,
  History,
  AlertCircle,
  CalendarClock,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react-native";
import type { WalletTransaction, Wallet as WalletType } from "@/types";

export default function FinanceScreen() {
  const navigation = useNavigation();
  const { store } = useVendor();
  const storeId = store?.id;

  const {
    data: wallet,
    isLoading: walletLoading,
    refetch: refetchWallet,
  } = useQuery({
    queryKey: ["vendor-wallet", storeId],
    queryFn: async (): Promise<WalletType> => {
      const snap = await getDoc(doc(db, "stores", storeId!, "wallet", "main"));
      return snap.exists()
        ? (snap.data() as WalletType)
        : { currentBalance: 0, pendingBalance: 0, totalEarned: 0 };
    },
    enabled: !!storeId,
  });

  const {
    data: transactions = [],
    isFetching: transactionsFetching,
    refetch: refetchTransactions,
  } = useQuery({
    queryKey: ["vendor-wallet-transactions", storeId],
    queryFn: async (): Promise<WalletTransaction[]> => {
      // credit + debit (refunds) — excludes only "payout" (failed payout
      // attempts from the now-removed withdrawal feature). A refund debit
      // used to be invisible here even though it genuinely does adjust
      // totalEarned — this is what the refund notification points to.
      const q = query(
        collection(db, "stores", storeId!, "wallet_transactions"),
        where("type", "in", ["credit", "debit"]),
        orderBy("createdAt", "desc"),
        limit(10)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as WalletTransaction[];
    },
    enabled: !!storeId,
  });

  const { data: monthEarned = 0, refetch: refetchMonth } = useQuery({
    queryKey: ["vendor-wallet-month", storeId],
    queryFn: async (): Promise<number> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const q = query(
        collection(db, "stores", storeId!, "wallet_transactions"),
        where("type", "in", ["credit", "debit"]),
        where("createdAt", ">=", monthStart)
      );
      const snap = await getDocs(q);
      return snap.docs.reduce((total, d) => {
        const tx = d.data();
        const amount = tx.amount || 0;
        return tx.type === "debit" ? total - amount : total + amount;
      }, 0);
    },
    enabled: !!storeId,
  });

  const onRefresh = () => {
    refetchWallet();
    refetchTransactions();
    refetchMonth();
  };

  const payout = store?.payoutConfig;
  const hasSubaccount = !!payout?.subaccountCode;
  const maskedAccount = payout?.accountNumber
    ? `••••${String(payout.accountNumber).slice(-3)}`
    : "";

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 bg-white flex-row items-center gap-3">
        <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Menu size={24} color="black" />
        </Pressable>
        <View>
          <H1 className="text-xl font-black uppercase">Finance</H1>
          <P className="text-xs text-zinc-400 font-bold">Track your earnings</P>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={walletLoading || transactionsFetching}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Payout Method — view only, editable on web */}
        <View className="bg-white p-5 rounded-3xl border border-zinc-100 shadow-sm">
          <View className="flex-row items-center gap-2 mb-3">
            <Wallet size={16} color="#71717a" />
            <P className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
              Payout Method
            </P>
          </View>

          {hasSubaccount ? (
            <>
              <P className="font-black text-lg">
                {payout?.bankName || "Bank"} {maskedAccount}
              </P>
              {payout?.accountName && (
                <P className="text-xs text-zinc-500 font-bold uppercase mt-1">
                  {payout.accountName}
                </P>
              )}
            </>
          ) : (
            <View className="flex-row items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl">
              <AlertCircle size={16} color="#dc2626" />
              <P className="flex-1 text-red-700 text-xs font-bold">
                No payout method linked — your store can&apos;t accept orders yet.
              </P>
            </View>
          )}

          <Pressable
            onPress={() =>
              Linking.openURL("https://copdrop.io/admin/settings?tab=payouts")
            }
            className="mt-4 flex-row items-center justify-center gap-2 bg-zinc-50 border border-zinc-100 py-3 rounded-xl active:opacity-80"
          >
            <P className="text-xs font-bold uppercase text-zinc-600">
              {hasSubaccount ? "Change on Web Dashboard" : "Set Up on Web Dashboard"}
            </P>
            <ExternalLink size={14} color="#52525b" />
          </Pressable>
        </View>

        {!!store?.pendingRefundDebt && store.pendingRefundDebt > 0.005 && (
          <View className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex-row items-start gap-3">
            <AlertCircle size={18} color="#b45309" />
            <P className="flex-1 text-amber-900 text-sm font-medium">
              Recovering {formatCurrency(store.pendingRefundDebt)} from a
              recent refund — your payout rate is temporarily 80% platform /
              20% you on new orders until this clears, then it goes back to
              normal automatically.
            </P>
          </View>
        )}

        {!!store?.pendingRefundDebt && store.pendingRefundDebt < -0.005 && (
          <View className="bg-green-50 border border-green-200 p-4 rounded-2xl flex-row items-start gap-3">
            <AlertCircle size={18} color="#16a34a" />
            <P className="flex-1 text-green-900 text-sm font-medium">
              You&apos;re owed {formatCurrency(-store.pendingRefundDebt)} back
              from a refund that recovered slightly more than needed —
              you&apos;ll get 100% of your next order(s) until it&apos;s paid
              back.
            </P>
          </View>
        )}

        {/* Settlement summary */}
        <View className="bg-zinc-900 p-6 rounded-3xl">
          <View className="flex-row items-center gap-2 mb-2">
            <CalendarClock size={12} color="#a1a1aa" />
            <P className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
              Settlement
            </P>
          </View>
          {hasSubaccount ? (
            <>
              <H1 className="text-white text-xl font-black leading-tight">
                Auto-settles to {payout?.bankName || "your bank"}
              </H1>
              <P className="text-zinc-400 text-xs mt-2 font-medium">
                {maskedAccount ? `Account ${maskedAccount} • ` : ""}Paystack
                pays this out on its normal settlement schedule — no action
                needed.
              </P>
            </>
          ) : (
            <H1 className="text-zinc-500 text-xl font-black">Not set up yet</H1>
          )}
        </View>

        {/* Balance cards */}
        <View className="flex-row gap-4">
          <View className="flex-1 bg-white border border-zinc-100 p-5 rounded-3xl shadow-sm">
            <P className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              This Month
            </P>
            <H1 className="text-2xl font-black text-green-600">
              {formatCurrency(monthEarned)}
            </H1>
          </View>
          <View className="flex-1 bg-white border border-zinc-100 p-5 rounded-3xl shadow-sm">
            <P className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              Total Earned
            </P>
            <H1 className="text-2xl font-black text-green-600">
              {formatCurrency(wallet?.totalEarned || 0)}
            </H1>
          </View>
        </View>

        {wallet && wallet.pendingBalance > 0 && (
          <View className="bg-white border border-zinc-100 p-5 rounded-3xl shadow-sm">
            <P className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              Pending (T+2)
            </P>
            <H1 className="text-xl font-black text-zinc-400">
              {formatCurrency(wallet.pendingBalance)}
            </H1>
            <P className="text-[10px] text-zinc-400 mt-2 font-medium">
              Funds clear 48h after delivery (Starter Plan).
            </P>
          </View>
        )}

        {/* Recent Settlements */}
        <View className="bg-white border border-zinc-100 rounded-3xl p-5 shadow-sm">
          <View className="flex-row items-center gap-2 mb-4">
            <History size={16} color="black" />
            <P className="font-black text-base">Recent Settlements</P>
          </View>

          {transactions.length === 0 ? (
            <View className="items-center justify-center py-10">
              <P className="text-zinc-400 font-bold text-sm">
                No transactions yet
              </P>
            </View>
          ) : (
            <View className="gap-3">
              {transactions.map((tx) => {
                const isCredit = tx.type === "credit";
                return (
                  <View
                    key={tx.id}
                    className="flex-row items-center justify-between p-3 bg-zinc-50 rounded-2xl border border-zinc-100"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      <View
                        className={`w-9 h-9 rounded-full items-center justify-center ${
                          isCredit ? "bg-green-100" : "bg-red-100"
                        }`}
                      >
                        <ArrowUpRight
                          size={16}
                          color={isCredit ? "#16a34a" : "#dc2626"}
                          style={
                            isCredit
                              ? { transform: [{ rotate: "180deg" }] }
                              : undefined
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <P className="font-bold text-sm" numberOfLines={1}>
                          {tx.description}
                        </P>
                        <P className="text-[10px] text-zinc-400 font-bold uppercase">
                          {tx.createdAt?.seconds
                            ? new Date(
                                tx.createdAt.seconds * 1000
                              ).toLocaleDateString()
                            : ""}{" "}
                          • {tx.status}
                        </P>
                      </View>
                    </View>
                    <P
                      className={`font-black ${
                        isCredit ? "text-green-600" : "text-zinc-900"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </P>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
