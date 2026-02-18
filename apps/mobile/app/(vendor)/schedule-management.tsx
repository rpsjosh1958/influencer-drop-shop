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
import { useState, useEffect, useMemo } from "react";
import { useVendor } from "@/context/vendor-context";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { router } from "expo-router";
import {
  ArrowLeft,
  Save,
  Clock,
  Calendar as CalendarIcon,
  X,
} from "lucide-react-native";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
} from "date-fns";

export default function ScheduleManagementScreen() {
  const { store } = useVendor();
  const [cancellationHours, setCancellationHours] = useState("24");
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!store?.id) return;
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(
          doc(db, "stores", store.id, "availability", "settings"),
        );
        if (snap.exists()) {
          const data = snap.data();
          setCancellationHours(String(data.cancellationHours ?? 24));
        }

        const generalSnap = await getDoc(
          doc(db, "stores", store.id, "availability", "general"),
        );
        if (generalSnap.exists()) {
          setBlockedDates(generalSnap.data().blockedDates || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, [store?.id]);

  const handleSave = async () => {
    const hours = parseInt(cancellationHours);
    if (isNaN(hours) || hours < 0) {
      Alert.alert("Error", "Please enter a valid number of hours");
      return;
    }
    setLoading(true);
    try {
      // Save Policy
      await setDoc(
        doc(db, "stores", store.id, "availability", "settings"),
        { cancellationHours: hours },
        { merge: true },
      );

      // Save Blocked Dates
      await setDoc(
        doc(db, "stores", store.id, "availability", "general"),
        { blockedDates },
        { merge: true },
      );

      Alert.alert("Success", "Schedule settings updated");
      router.back();
    } catch (e) {
      Alert.alert("Error", "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = (dateStr: string) => {
    setBlockedDates((prev) => {
      if (prev.includes(dateStr)) {
        return prev.filter((d) => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 flex-row items-center justify-between">
        <ArrowLeft size={24} color="black" onPress={() => router.back()} />
        <H1 className="text-xl font-black uppercase">Schedule Management</H1>
        <View style={{ width: 24 }} />
      </View>

      {fetching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="black" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 24 }}>
          {/* Cancellation Policy */}
          <View className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 mb-6">
            <View className="flex-row items-center gap-3 mb-4">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center">
                <Clock size={20} color="#2563eb" />
              </View>
              <View>
                <H1 className="text-lg font-bold">Cancellation Policy</H1>
                <P className="text-zinc-500 text-xs">Notice period required</P>
              </View>
            </View>

            <TextInput
              value={cancellationHours}
              onChangeText={setCancellationHours}
              className="bg-white border border-zinc-200 rounded-xl p-4 font-black text-2xl text-center mb-2"
              keyboardType="number-pad"
            />
            <P className="text-zinc-500 text-xs text-center">
              Customers must cancel{" "}
              <P className="font-bold">{cancellationHours} hours</P> in advance.
            </P>
          </View>

          {/* Blocked Dates */}
          <View className="bg-zinc-50 p-6 rounded-3xl border border-zinc-100 mb-20">
            <View className="flex-row items-center gap-3 mb-6">
              <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center">
                <CalendarIcon size={20} color="#dc2626" />
              </View>
              <View>
                <H1 className="text-lg font-bold">Blocked Dates</H1>
                <P className="text-zinc-500 text-xs">
                  Tap to block/unblock dates
                </P>
              </View>
            </View>

            {/* Calendar Controls */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <P className="font-bold text-lg p-2">←</P>
              </Pressable>
              <P className="font-bold text-lg">
                {format(currentMonth, "MMMM yyyy")}
              </P>
              <Pressable
                onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <P className="font-bold text-lg p-2">→</P>
              </Pressable>
            </View>

            {/* Day of Week Headers */}
            <View className="flex-row mb-2">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                <View key={i} className="w-[14.28%] items-center">
                  <P className="text-xs font-bold text-zinc-400">{day}</P>
                </View>
              ))}
            </View>

            {/* Calendar Grid */}
            <View className="flex-row flex-wrap">
              {/* Empty cells for days before the first of the month */}
              {Array.from({ length: startOfMonth(currentMonth).getDay() }).map(
                (_, i) => (
                  <View
                    key={`empty-${i}`}
                    className="w-[14.28%] aspect-square"
                  />
                ),
              )}
              {calendarDays.map((date, i) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const isBlocked = blockedDates.includes(dateStr);
                const isToday = isSameDay(date, new Date());

                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleDate(dateStr)}
                    className={`w-[14.28%] aspect-square items-center justify-center rounded-lg border ${
                      isBlocked
                        ? "bg-red-500 border-red-500"
                        : isToday
                          ? "bg-black border-black"
                          : "bg-white border-zinc-100"
                    }`}
                  >
                    <P
                      className={`text-xs font-bold ${
                        isBlocked || isToday ? "text-white" : "text-black"
                      }`}
                    >
                      {format(date, "d")}
                    </P>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {blockedDates.length > 0 && (
                <P className="w-full text-xs font-bold text-zinc-400 mb-2 uppercase">
                  Blocked Dates Summary
                </P>
              )}
              {blockedDates
                .sort()
                .slice(0, 5)
                .map((d) => (
                  <View
                    key={d}
                    className="bg-red-100 px-3 py-1 rounded-full flex-row items-center gap-2"
                  >
                    <P className="text-xs font-bold text-red-700">{d}</P>
                    <Pressable onPress={() => toggleDate(d)}>
                      <X size={12} color="#b91c1c" />
                    </Pressable>
                  </View>
                ))}
              {blockedDates.length > 5 && (
                <P className="text-xs text-zinc-400 pt-1">
                  ...and {blockedDates.length - 5} more
                </P>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      <View className="p-6 border-t border-zinc-100 absolute bottom-0 w-full bg-white">
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
                Save Schedule
              </P>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
