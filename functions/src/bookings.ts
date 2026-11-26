import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

const ACTIVE = ["pending", "confirmed"];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
export const addMinutesToTime = (hhmm: string, minutes: number) => {
  const t = toMinutes(hhmm) + minutes;
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

// Same test the booking modals use for a slot: the new appointment plus the
// service's buffer may not start inside another booking (plus buffer).
export const overlaps = (
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string },
  bufferMinutes: number
) =>
  toMinutes(a.startTime) < toMinutes(b.endTime) + bufferMinutes &&
  toMinutes(a.endTime) + bufferMinutes > toMinutes(b.startTime);

// Taken times on a date, for the booking modals' slot picker. Shoppers can't
// query the bookings themselves (rules keep other customers' bookings
// private), so the modal used to get permission-denied, swallow it, and show
// every slot as free. Returns times only — no customer details.
export const getBookedSlots = onCall(async (request) => {
  const { storeId, date } = request.data || {};
  if (typeof storeId !== "string" || !storeId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError("invalid-argument", "storeId and date (yyyy-MM-dd) are required");
  }
  const snap = await admin
    .firestore()
    .collection("stores")
    .doc(storeId)
    .collection("bookings")
    .where("date", "==", date)
    .where("status", "in", ACTIVE)
    .get();
  return {
    slots: snap.docs.map((d) => ({
      startTime: d.data().startTime as string,
      endTime: d.data().endTime as string,
    })),
  };
});

// Bookings are written straight from the app (public create rule), so the
// server checks each new one: name/price/duration come from the service
// itself, not the client, and a booking overlapping one made earlier (two
// customers racing, or an app version that couldn't see taken slots) is
// cancelled — onBookingStatusUpdated tells the customer. Returns false if
// it was cancelled.
export const checkNewBooking = async (
  ref: FirebaseFirestore.DocumentReference,
  booking: FirebaseFirestore.DocumentData
): Promise<boolean> => {
  const storeRef = ref.parent.parent!;
  const service = booking.serviceId
    ? (await storeRef.collection("services").doc(String(booking.serviceId)).get()).data()
    : undefined;
  if (!service || typeof booking.startTime !== "string" || !/^\d{2}:\d{2}$/.test(booking.startTime)) {
    return true; // nothing reliable to check against — the vendor sees it as-is
  }

  const duration = Number(service.duration) || Number(booking.duration) || 0;
  const endTime = addMinutesToTime(booking.startTime, duration);
  const mine = { startTime: booking.startTime, endTime };
  const myCreated = booking.createdAt?.toMillis?.() ?? Date.now();

  const sameDay = await storeRef
    .collection("bookings")
    .where("date", "==", booking.date)
    .where("status", "in", ACTIVE)
    .get();
  const clash = sameDay.docs.some((d) => {
    if (d.id === ref.id) return false;
    const other = d.data();
    if (typeof other.startTime !== "string" || typeof other.endTime !== "string") return false;
    const otherCreated = other.createdAt?.toMillis?.() ?? 0;
    // Only the later of two clashing bookings gives way.
    const isEarlier = otherCreated < myCreated || (otherCreated === myCreated && d.id < ref.id);
    return isEarlier && overlaps(mine, other as typeof mine, Number(service.bufferTime) || 0);
  });

  if (clash) {
    await ref.update({
      status: "cancelled",
      cancelledBy: "system",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return false;
  }

  await ref.update({
    serviceName: service.name ?? booking.serviceName ?? "",
    servicePrice: Number(service.price) || 0,
    duration,
    endTime,
  });
  return true;
};
