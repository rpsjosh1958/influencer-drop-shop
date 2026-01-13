"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";
import { Loader2, Clock, Calendar, Plus, Trash2, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DaySchedule, TimeSlot, AvailabilitySettings } from "@/types";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DEFAULT_SLOT: TimeSlot = { start: "09:00", end: "17:00" };

const DEFAULT_SCHEDULE: AvailabilitySettings["schedule"] = {
  monday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
  tuesday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
  wednesday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
  thursday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
  friday: { enabled: true, slots: [{ ...DEFAULT_SLOT }] },
  saturday: { enabled: false, slots: [] },
  sunday: { enabled: false, slots: [] },
};

export default function SchedulePage() {
  const { storeId, loading: storeLoading } = useAdminStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  const [schedule, setSchedule] =
    useState<AvailabilitySettings["schedule"]>(DEFAULT_SCHEDULE);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [cancellationHours, setCancellationHours] = useState(24);

  // Fetch existing availability
  useEffect(() => {
    if (!storeId) return;
    const fetchAvailability = async () => {
      try {
        const docRef = doc(db, "stores", storeId, "availability", "settings");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as AvailabilitySettings;
          setSchedule(data.schedule || DEFAULT_SCHEDULE);
          setBlockedDates(data.blockedDates || []);
          setCancellationHours(data.cancellationHours || 24);
        }
      } catch (err) {
        console.error("Failed to fetch availability", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [storeId]);

  const handleSave = async () => {
    if (!storeId) return;
    setSaving(true);
    setSuccess("");
    try {
      const docRef = doc(db, "stores", storeId, "availability", "settings");
      await setDoc(docRef, {
        storeId,
        schedule,
        blockedDates,
        cancellationHours,
        updatedAt: serverTimestamp(),
      });
      setSuccess("Schedule saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Failed to save availability", err);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        enabled: !prev[day as keyof typeof prev].enabled,
        slots: !prev[day as keyof typeof prev].enabled
          ? [{ ...DEFAULT_SLOT }]
          : [],
      },
    }));
  };

  const updateSlot = (
    day: string,
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        slots: prev[day as keyof typeof prev].slots.map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const addSlot = (day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        slots: [
          ...prev[day as keyof typeof prev].slots,
          { start: "12:00", end: "18:00" },
        ],
      },
    }));
  };

  const removeSlot = (day: string, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: {
        ...prev[day as keyof typeof prev],
        slots: prev[day as keyof typeof prev].slots.filter(
          (_, i) => i !== index
        ),
      },
    }));
  };

  const removeBlockedDate = (date: string) => {
    setBlockedDates((prev) => prev.filter((d) => d !== date));
  };

  if (storeLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedule</h1>
          <p className="text-zinc-500">
            Set your working hours and blocked dates.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-3 bg-black text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          Save Changes
        </button>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-medium"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Working Hours */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-xl">
            <Clock className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg text-black font-bold">Working Hours</h2>
            <p className="text-sm text-zinc-500">
              Set your available time slots for each day.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {DAYS.map((day) => {
            const daySchedule = schedule[day];
            return (
              <div
                key={day}
                className={`p-4 rounded-2xl border transition-colors ${
                  daySchedule.enabled
                    ? "border-zinc-200 bg-zinc-50"
                    : "border-zinc-100 bg-zinc-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-12 h-6 rounded-full transition-colors relative ${
                        daySchedule.enabled ? "bg-green-500" : "bg-zinc-300"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          daySchedule.enabled ? "left-7" : "left-1"
                        }`}
                      />
                    </button>
                    <span
                      className={`font-medium ${
                        daySchedule.enabled ? "text-zinc-900" : "text-zinc-400"
                      }`}
                    >
                      {DAY_LABELS[day]}
                    </span>
                  </div>

                  {daySchedule.enabled && (
                    <button
                      onClick={() => addSlot(day)}
                      className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Slot
                    </button>
                  )}
                </div>

                {daySchedule.enabled && daySchedule.slots.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {daySchedule.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) =>
                            updateSlot(day, idx, "start", e.target.value)
                          }
                          className="px-3 py-2 border text-black border-zinc-200 rounded-lg text-sm bg-white"
                        />
                        <span className="text-zinc-400">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) =>
                            updateSlot(day, idx, "end", e.target.value)
                          }
                          className="px-3 py-2 border text-black border-zinc-200 rounded-lg text-sm bg-white"
                        />
                        {daySchedule.slots.length > 1 && (
                          <button
                            onClick={() => removeSlot(day, idx)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blocked Dates */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 rounded-xl">
            <Calendar className="text-red-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg text-black font-bold">Blocked Dates</h2>
            <p className="text-sm text-zinc-500">
              Select dates to block from the calendar.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <style jsx global>{`
            .react-datepicker {
              font-family: inherit;
              border: 1px solid #e4e4e7;
              border-radius: 1rem;
              overflow: hidden;
            }
            .react-datepicker__header {
              background-color: #fafafa;
              border-bottom: 1px solid #e4e4e7;
              padding-top: 1rem;
            }
            .react-datepicker__current-month {
              font-weight: 700;
              color: #18181b;
              margin-bottom: 0.5rem;
            }
            .react-datepicker__day-name {
              color: #71717a;
              font-weight: 500;
              width: 2.5rem;
            }
            .react-datepicker__day {
              width: 2.5rem;
              height: 2.5rem;
              line-height: 2.5rem;
              margin: 0.1rem;
              border-radius: 0.5rem;
              color: #18181b;
            }
            .react-datepicker__day:hover {
              background-color: #f4f4f5;
            }
            .react-datepicker__day--selected {
              background-color: #ef4444 !important;
              color: white !important;
            }
            .react-datepicker__day--keyboard-selected {
              background-color: transparent;
              color: #18181b;
            }
            .react-datepicker__navigation {
              top: 1rem;
            }
          `}</style>

          <div className="flex justify-center md:justify-start">
            <DatePicker
              inline
              selected={null}
              onChange={(date: Date | null) => {
                if (!date) return;
                // normalize to YYYY-MM-DD
                const dateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD
                if (blockedDates.includes(dateStr)) {
                  removeBlockedDate(dateStr);
                } else {
                  setBlockedDates((prev) => [...prev, dateStr].sort());
                }
              }}
              highlightDates={[
                {
                  "react-datepicker__day--selected": blockedDates.map(
                    (d) => new Date(d)
                  ),
                },
              ]}
              minDate={new Date()}
            />
          </div>

          <div className="flex-1">
            <h3 className="font-bold text-sm text-zinc-900 mb-3">
              Blocked Dates ({blockedDates.length})
            </h3>
            {blockedDates.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-[300px] overflow-y-auto content-start">
                {blockedDates.map((date) => (
                  <div
                    key={date}
                    className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium transition-colors hover:bg-red-100"
                  >
                    <span>
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => removeBlockedDate(date)}
                      className="hover:text-red-900 p-0.5 rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-90% flex flex-col items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-100 rounded-2xl p-8">
                <Calendar size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No dates blocked yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Policy */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-xl">
            <Clock className="text-amber-600" size={20} />
          </div>
          <div>
            <h2 className="text-lg text-black font-bold">
              Cancellation Policy
            </h2>
            <p className="text-sm text-zinc-500">
              How far in advance can customers cancel?
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={168}
            value={cancellationHours}
            onChange={(e) =>
              setCancellationHours(parseInt(e.target.value) || 0)
            }
            className="w-24 px-4 py-3 text-black border border-zinc-200 rounded-xl text-center font-bold"
          />
          <span className="text-zinc-600">hours before the appointment</span>
        </div>
        <p className="text-xs text-zinc-400">
          Customers can cancel up to {cancellationHours} hours before their
          scheduled appointment.
        </p>
      </div>
    </div>
  );
}
