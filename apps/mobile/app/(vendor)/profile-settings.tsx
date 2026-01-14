import {
  View,
  TextInput,
  ActivityIndicator,
  Linking,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  User,
  Building2,
} from "lucide-react-native";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function ProfileSettingsScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    getDoc(doc(db, "users", auth.currentUser.uid))
      .then((snap) => {
        if (snap.exists()) setUserData(snap.data());
      })
      .finally(() => setLoading(false));
  }, []);

  const Field = ({ label, value, icon }: any) => (
    <View className="mb-4">
      <P className="text-xs font-bold text-zinc-400 uppercase mb-2">{label}</P>
      <View className="flex-row items-center bg-zinc-100 border border-zinc-200 rounded-xl p-4">
        {icon && <View className="mr-3">{icon}</View>}
        <P className="font-bold text-zinc-600 text-base flex-1">
          {value || "N/A"}
        </P>
        <ShieldCheck size={16} color="#a1a1aa" />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">Profile</H1>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="black" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-6">
          <View className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-100">
            <P className="text-blue-800 text-sm font-medium">
              Profile details are managed by the administration to ensure
              verification. Contact support for changes.
            </P>
          </View>

          {userData?.vendorType === "company" ? (
            /* COMPANY PROFILE */
            <View>
              <View className="flex-row items-center gap-2 mb-6">
                <Building2 size={24} color="black" />
                <H1 className="text-xl font-bold">Company Details</H1>
              </View>

              <Field label="Company Name" value={userData.fullName} />
              <Field label="Official Phone" value={userData.phone} />

              <View className="h-px bg-zinc-100 my-6" />

              <H1 className="text-lg font-bold mb-4">Contact Person</H1>
              <Field label="Name" value={userData.contactPerson?.name} />
              <Field
                label="Position"
                value={userData.contactPerson?.position}
              />
              <Field
                label="Direct Email"
                value={userData.contactPerson?.email}
              />
              <Field
                label="Direct Phone"
                value={userData.contactPerson?.phone}
              />
            </View>
          ) : (
            /* INDIVIDUAL PROFILE */
            <View>
              <View className="flex-row items-center gap-2 mb-6">
                <User size={24} color="black" />
                <H1 className="text-xl font-bold">Personal Details</H1>
              </View>

              <Field
                label="Full Name"
                value={userData?.fullName || auth.currentUser?.displayName}
              />
              <Field
                label="Email Address"
                value={userData?.email || auth.currentUser?.email}
              />
              <Field label="Phone Number" value={userData?.phone} />
              <Field
                label="Ghana Card (NIA)"
                value={userData?.identity?.ghanaCard}
                icon={<ShieldCheck size={18} color="#000" />}
              />
            </View>
          )}

          {/* Document Link */}
          {userData?.identity?.companyDoc && (
            <Pressable
              onPress={() => Linking.openURL(userData.identity.companyDoc)}
              className="mt-6 flex-row items-center justify-center gap-2 p-4 bg-zinc-50 rounded-xl border border-zinc-200"
            >
              <P className="font-bold underline">View Registration Document</P>
              <ExternalLink size={16} color="black" />
            </Pressable>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
