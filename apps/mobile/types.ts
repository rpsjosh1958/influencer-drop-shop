// Firestore Timestamp shape (admin/web SDKs both expose these). Using this
// instead of `any` still lets call sites do `.toDate()`/`.seconds` safely.
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  stock: number;
  price: number;
  options: Record<string, string>;
  imageIndex?: number;
  color?: string;
  colorCode?: string;
  size?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
  imageUrl: string;
  imagePath?: string;
  hasVariants: boolean;
  variants?: ProductVariant[];
  stock: number;
  createdAt: number | FirestoreTimestamp;
  category?: string;
  type: string;
  storeId?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: FirestoreTimestamp;
}

export interface Complaint {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  message: string;
  // Not in web's Complaint type but read (with fallback) in
  // vendor-complaint-details.tsx — some records apparently carry these.
  type?: string;
  description?: string;
  target: "store" | "platform";
  // "open" isn't in web's Complaint status set but vendor-context.tsx
  // checks for it — kept to match actual usage rather than narrowing it.
  status: "unread" | "read" | "resolved" | "open";
  createdAt: FirestoreTimestamp;
  reply?: {
    message: string;
    createdAt: FirestoreTimestamp;
    sender: "admin";
  };
}

export type StoreType = "product" | "service" | "hybrid";

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: StoreType;
  ownerId: string;
  status: "live" | "closed";
  plan: "starter" | "growth";
  isVerified?: boolean;
  isSuspended?: boolean;
  onboardingStatus?: "pending" | "approved" | "rejected" | "needs_more_info";
  createdAt: FirestoreTimestamp;
  theme?: {
    primaryColor: string;
    heroText?: string;
    footerText?: string;
    logoUrl?: string;
    fontFamily?: string;
  };
  payoutConfig?: {
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
    subaccountCode?: string;
  };
  socials?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    whatsapp?: string;
  };
}

export interface ServiceItem {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  images: string[];
  imageUrl?: string;
  duration: number;
  bufferTime?: number;
  category?: string;
  storeId: string;
  isActive: boolean;
  createdAt: FirestoreTimestamp;
}

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

export interface Booking {
  id: string;
  storeId: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: BookingStatus;
  createdAt: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  isAnonymous: boolean;
  rating: number;
  comment?: string;
  createdAt: FirestoreTimestamp;
  reply?: string;
}

export interface Order {
  id: string;
  storeId: string;
  storeName?: string;
  userId?: string;
  // Some order-creation paths write customerId instead of/alongside userId
  // (see vendor-order-details.tsx's `order.userId || order.customerId`) —
  // kept as a real, optional field rather than narrowed away.
  customerId?: string;
  customerName?: string;
  email?: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  // Loosely typed to match apps/web/src/types/index.ts's Order — the real
  // set of values in use (pending/paid/processing/packaged/sent-out/
  // shipped/delivered/completed/cancelled/refunded/manual) isn't fully
  // consistent across the codebase, so a strict union risks false errors.
  status: string;
  createdAt: FirestoreTimestamp; // Firestore Timestamp
  address?: Address;
  paymentMethod?: string;
  hasReview?: boolean;
  customerEmail?: string;
  customerPhone?: string;
  customerNote?: string;
  shipping?: {
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    street?: string;
    zip?: string;
    fullName?: string;
    email?: string;
  };
  vendorNetAmount?: number;
  // Refunds — refundedAmount is the cumulative amount actually confirmed
  // refunded (refund.processed); pendingRefundAmount/refundStatus track a
  // refund still in flight (see functions/src/refunds.ts). Triggering a
  // refund is web-admin-only for now, matching finance/payouts.
  refundedAmount?: number;
  refundStatus?: "pending" | "processing" | "needs-attention" | "processed" | "failed";
  pendingRefundAmount?: number;
  // Disputes/chargebacks — detect + notify only, see functions/src/webhooks.ts.
  disputeStatus?: string;
}

// Shape of a line item on a PERSISTED order (Order.items) — distinct from
// the client-side cart's own CartItem type in context/cart-context.tsx
// (which uses `variant`, not `selectedVariant`; the two aren't the same
// stage of the checkout pipeline despite the shared name).
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  variant?: { id: string; name?: string } | null;
  selectedVariant?: { id: string; name?: string; price?: number } | null;
}

export interface Address {
  // Pre-existing type had `zipCode`, but no real code anywhere writes or
  // reads that field — actual usage (profile.tsx, checkout.tsx) is `zip`,
  // plus an `id` (needed to edit/remove a specific saved address) that was
  // also missing from this type.
  id?: string;
  street: string;
  city: string;
  country: string;
  zip?: string;
  isDefault?: boolean;
}
