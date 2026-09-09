// Canonical order/booking status → color mapping, kept in sync with the web
// admin's own logic (apps/web/src/app/(admin)/admin/orders/page.tsx's
// getStatusColor and .../bookings/page.tsx's STATUS_CONFIG). Use these
// instead of ad-hoc per-screen color logic so the two apps never drift.

export function getOrderStatusColor(status: string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case "open":
    case "pending":
    case "paid":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    case "packaged":
      return { bg: "bg-yellow-100", text: "text-yellow-700" };
    case "sent-out":
      return { bg: "bg-purple-100", text: "text-purple-700" };
    case "delivered":
      return { bg: "bg-green-100", text: "text-green-700" };
    case "refunded":
    case "partially_refunded":
      return { bg: "bg-red-100", text: "text-red-700" };
    default:
      return { bg: "bg-zinc-100", text: "text-zinc-700" };
  }
}

export function getBookingStatusColor(status: string): {
  bg: string;
  text: string;
} {
  switch (status) {
    case "confirmed":
      return { bg: "bg-blue-100", text: "text-blue-700" };
    case "completed":
      return { bg: "bg-green-100", text: "text-green-700" };
    case "cancelled":
    case "no-show":
      return { bg: "bg-red-100", text: "text-red-700" };
    case "pending":
      return { bg: "bg-amber-100", text: "text-amber-700" };
    default:
      return { bg: "bg-zinc-100", text: "text-zinc-500" };
  }
}
