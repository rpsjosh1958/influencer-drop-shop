import { View, Pressable } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Clock, AlertCircle, XCircle } from "lucide-react-native";
import { P } from "@/components/ui/text";
import { auth } from "@/lib/firebase";
import { openUrl, supportEmailUrl } from "@/lib/links";

type Status = "pending" | "approved" | "needs_more_info" | "rejected" | undefined;

// Review state of the active store, set by the super admin (vendor details
// modal). Nothing shows once approved — or for older stores with no status,
// which predate review and count as approved everywhere else too.
export function OnboardingBanner({
  storeId,
  status,
  notes,
}: {
  storeId: string;
  status: Status;
  notes?: string;
}) {
  const router = useRouter();
  if (!status || status === "approved") return null;

  if (status === "pending") {
    return (
      <View className="flex-row gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-6">
        <Clock size={20} color="#2563eb" />
        <View className="flex-1">
          <P className="font-bold text-blue-900">Your store is under review</P>
          <P className="text-xs text-blue-800 mt-1 leading-5">
            We&apos;re checking your details and will notify you once it&apos;s approved. You can add products
            in the meantime.
          </P>
        </View>
      </View>
    );
  }

  const needsInfo = status === "needs_more_info";
  return (
    <View
      className={`p-4 rounded-2xl mb-6 border ${needsInfo ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}
    >
      <View className="flex-row items-center gap-2">
        {needsInfo ? <AlertCircle size={20} color="#b45309" /> : <XCircle size={20} color="#dc2626" />}
        <P className={`font-bold ${needsInfo ? "text-amber-900" : "text-red-900"}`}>
          {needsInfo ? "Action needed before approval" : "Your store wasn't approved"}
        </P>
      </View>
      {!!notes && (
        <P className={`text-sm mt-2 italic ${needsInfo ? "text-amber-900" : "text-red-900"}`}>“{notes}”</P>
      )}
      <Pressable
        onPress={() =>
          needsInfo
            ? router.push(`/become-vendor?resubmit=${storeId}` as Href)
            : openUrl(supportEmailUrl("Store application", auth.currentUser?.email))
        }
        className={`mt-3 self-start px-4 py-2.5 rounded-xl ${needsInfo ? "bg-amber-600" : "bg-red-600"}`}
      >
        <P className="text-white text-xs font-bold uppercase tracking-wider">
          {needsInfo ? "Update & resubmit" : "Contact support"}
        </P>
      </Pressable>
    </View>
  );
}
