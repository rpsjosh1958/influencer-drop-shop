import type { Href } from "expo-router";
import type { Notification } from "@/context/notification-context";

// Shared order/booking route resolution for a notification, used by every
// tap surface (OS push tap, in-app notification lists, the in-app banner)
// so they don't each duplicate/drift from their own routing logic. Doesn't
// handle "vendor_complaint" (opens a modal with local component state, not
// a route) or "drop"/"broadcast" (no target) — callers handle those
// themselves.
export function getNotificationRoute(
  notification: Pick<Notification, "type" | "data">
): Href | null {
  const data = notification.data;
  const orderId = data?.orderId || data?.id;
  const bookingId = data?.bookingId || data?.id;

  switch (notification.type) {
    case "vendor_order":
    case "store_order_received":
      return {
        pathname: "/(vendor)/orders",
        params: orderId ? { orderId } : undefined,
      } as Href;
    case "vendor_refund":
      // Refund/dispute updates affect the vendor's recorded earnings —
      // land on Finance, not the order itself (there's no per-order
      // refund view on mobile the way the web admin order modal has one).
      return { pathname: "/(vendor)/finance" } as Href;
    case "order_update":
      return {
        pathname: "/(tabs)/orders",
        params: orderId ? { orderId } : undefined,
      } as Href;
    case "vendor_booking":
    case "store_booking_received":
    case "booking_cancelled":
      return {
        pathname: "/(vendor)/bookings",
        params: bookingId ? { bookingId, date: data?.date } : undefined,
      } as Href;
    // "booking_confirmed"/"booking_cancelled_admin" are legacy — no code
    // writes them anymore (the client-side writer duplicated the server's
    // "booking_update" and was removed), kept only so old, already-sent
    // notification docs still route correctly.
    case "booking_confirmed":
    case "booking_cancelled_admin":
    case "booking_update":
      return {
        pathname: "/(tabs)/orders",
        params: bookingId ? { bookingId } : undefined,
      } as Href;
    default:
      return null;
  }
}
