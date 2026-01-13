import {
  View,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { H1, P } from "@/components/ui/text";
import { useState, useEffect } from "react";
import { useVendor } from "@/context/vendor-context";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";
import { ArrowLeft, Save, Clock } from "lucide-react-native";

export default function AvailabilitySettingsScreen() {
  const { store } = useVendor();
  const [cancellationHours, setCancellationHours] = useState("24");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!store?.id) return;
    // Fetch specifically the availability settings sub-doc
    getDoc(doc(db, "stores", store.id, "availability", "settings"))
      .then((snap) => {
        if (snap.exists()) {
          setCancellationHours(String(snap.data().cancellationHours ?? 24));
        }
      })
      .finally(() => setFetching(false));
  }, [store?.id]);

  const handleSave = async () => {
    const hours = parseInt(cancellationHours);
    if (isNaN(hours) || hours < 0) {
      Alert.alert("Error", "Please enter a valid number of hours");
      return;
    }
    setLoading(true);
    try {
      await setDoc(
        doc(db, "stores", store.id, "availability", "settings"),
        {
          cancellationHours: hours,
        },
        { merge: true }
      ); // Merge to avoid overwriting other settings if they exist
      Alert.alert("Success", "Policy updated");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to update policy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">Booking Policy</H1>
        <View style={{ width: 24 }} />
      </View>

      {fetching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="black" />
        </View>
      ) : (
        <ScrollView className="flex-1 p-6">
          <View className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100">
            <View className="flex-row items-center gap-3 mb-6">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                <Clock size={20} color="#2563eb" />
              </View>
              <View className="flex-1">
                <H1 className="text-lg font-bold">Cancellation Policy</H1>
                <P className="text-zinc-500 text-xs">
                  Define when customers can cancel
                </P>
              </View>
            </View>

            <P className="text-xs font-bold text-zinc-400 uppercase mb-2">
              Notice Period (Hours)
            </P>
            <TextInput
              value={cancellationHours}
              onChangeText={setCancellationHours}
              className="bg-white border border-zinc-200 rounded-xl p-4 font-black text-2xl text-center mb-2"
              keyboardType="number-pad"
            />
            <P className="text-zinc-500 text-xs text-center">
              Customers must cancel at least{" "}
              <P className="font-bold">{cancellationHours} hours</P> before the
              appointment to avoid penalties.
            </P>
          </View>
        </ScrollView>
      )}

      <View className="p-6 border-t border-zinc-100">
        <Pressable
          onPress={handleSave}
          disabled={loading}
          className="w-full bg-black py-4 rounded-2xl items-center justify-center flex-row gap-2 active:scale-[0.98]"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Save size={18} color="white" />
              <P className="text-white font-bold uppercase tracking-wider">
                Save Policy
              </P>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
