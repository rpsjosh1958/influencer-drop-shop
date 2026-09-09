import type { FieldValue } from "firebase/firestore";

// Firestore Timestamp fields show up in several shapes depending on how the
// data got here: a real `Timestamp` (client SDK reads), a plain
// `{seconds, nanoseconds}` object (serialized through JSON, e.g. server
// component props), a `Date`/ISO string (manually constructed), or a
// `FieldValue` sentinel (`serverTimestamp()` in an unwritten create/update
// payload). Use the `toJsDate`/`getTimestampSeconds` helpers in
// `@/lib/utils` to read one rather than accessing `.toDate()`/`.seconds`
// directly — narrowing this union at every call site isn't worth it.
export type FirestoreTimestampLike =
  | { toDate: () => Date; seconds: number; nanoseconds: number }
  | { seconds: number; nanoseconds: number }
  | Date
  | string
  | FieldValue;

export interface ProductOption {
  id: string;
  name: string; // e.g. "Size", "Color"
  values: string[]; // e.g. ["S", "M", "L"]
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. "Red / L"
  stock: number;
  price: number; // Specific price for this variant
  options: Record<string, string>; // { "Size": "L", "Color": "Red" }
  imageIndex?: number; // Optional: Link to gallery image index

  // Legacy fields (allow optional for backward compatibility or migration)
  color?: string;
  colorCode?: string;
  size?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;

  // Images
  images: string[]; // Main array of images
  imageUrl: string; // Keep for legacy/fallback (usually images[0])
  imagePath?: string; // For deletion of main image

  // Variants
  hasVariants: boolean;
  variants?: ProductVariant[];
  options?: ProductOption[];

  // Stock (Total stock if variants exist)
  stock: number;
  createdAt: number;
  category?: string;
  type: string;
  storeId?: string; // Links product to a specific store
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: FirestoreTimestampLike;
}

export interface OrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  selectedVariant?: { id: string; name?: string } | null;
}

export interface Order {
  id: string;
  customerName?: string;
  customerEmail: string;
  total: number;
  status: string;
  items: OrderItem[];
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
  createdAt: FirestoreTimestampLike;
  userId?: string;
  customerNote?: string;
  hasReview?: boolean;
  storeId?: string;
  vendorNetAmount?: number;
  paymentMethod?: string;
  // Refunds — refundedAmount is the cumulative amount actually confirmed
  // refunded (refund.processed); pendingRefundAmount/refundStatus track a
  // refund still in flight (see functions/src/refunds.ts).
  refundedAmount?: number;
  refundStatus?: "pending" | "processing" | "needs-attention" | "processed" | "failed";
  pendingRefundAmount?: number;
  // Disputes/chargebacks — detect + notify only, see functions/src/webhooks.ts.
  disputeStatus?: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  isAnonymous: boolean;
  rating: number;
  comment?: string;
  createdAt: FirestoreTimestampLike;
  reply?: string;
}

export interface Complaint {
  id: string;
  storeId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  message: string;
  target: "store" | "platform";
  status: "unread" | "read" | "resolved";
  createdAt: FirestoreTimestampLike;
  reply?: {
    message: string;
    createdAt: FirestoreTimestampLike;
    sender: "admin";
  };
}

// ========== STORE TYPE SYSTEM ==========

export type StoreType = "product" | "service" | "hybrid";

export interface StoreFeatures {
  hasProducts: boolean;
  hasServices: boolean;
  hasPreorders: boolean;
}

export interface StoreConfig {
  id: string;
  name: string;
  slug: string;
  category: string;
  type: StoreType;
  features: StoreFeatures;
  ownerId: string;
  status: "live" | "maintenance" | "unpaid";
  plan: "starter" | "growth";
  planExpiresAt?: FirestoreTimestampLike;
  planChangedAt?: FirestoreTimestampLike;
  isVerified?: boolean;
  isSuspended?: boolean;
  onboardingStatus?: "pending" | "approved" | "rejected" | "needs_more_info";
  onboardingUpdatedAt?: FirestoreTimestampLike;
  onboardingReviewerId?: string;
  onboardingNotes?: string;
  createdAt: FirestoreTimestampLike;
  logo?: string;
  theme?: {
    primaryColor: string;
    backgroundColor?: string;
    heroText?: string;
    footerText?: string;
    logoUrl?: string;
    fontFamily?: string;
    cardSize?: "small" | "medium" | "large";
    hero?: {
      enabled?: boolean;
      headline?: string;
      subheadline?: string;
      layout?: string;
      headlineColor?: string;
      headlineFont?: string;
      subheadlineFont?: string;
      backgroundType?: "color" | "image";
      backgroundColor?: string;
      backgroundImages?: string[];
      overlayOpacity?: number;
    };
    footer?: {
      enabled?: boolean;
      text?: string;
      contact?: {
        email?: string;
        address?: string;
      };
      socials?: {
        instagram?: string;
        twitter?: string;
        tiktok?: string;
      };
    };
  };
  payoutConfig?: {
    provider?: string;
    bankCode?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    subaccountCode?: string;
  } | null;
  // Real GHS amount still owed to the platform after a refund — see
  // functions/src/refunds.ts. While > 0, the store's subaccount runs at an
  // elevated percentage_charge to recover it from future order splits.
  pendingRefundDebt?: number;
  socials?: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    whatsapp?: string;
  };
}

// ========== SERVICE / BOOKING SYSTEM ==========

export interface ServiceItem {
  id: string;
  name: string;
  type: string;
  description: string;
  price: number;
  images: string[];
  imageUrl?: string; // Legacy fallback
  duration: number; // Duration in minutes
  bufferTime?: number; // Gap between appointments in minutes
  category?: string;
  storeId: string;
  isActive: boolean;
  createdAt: FirestoreTimestampLike;
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string; // "17:00"
}

export interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
}

export interface AvailabilitySettings {
  storeId: string;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  blockedDates: string[]; // ISO date strings "2026-01-15"
  cancellationHours: number; // Hours before appointment that cancellation is allowed
  updatedAt?: FirestoreTimestampLike;
}

// Store-scoped vendor support ticket (stores/{storeId}/tickets), read
// platform-wide by super-admin/support via a collectionGroup query.
export interface Ticket {
  id: string;
  storeId: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  createdAt: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
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
  serviceName: string; // Denormalized for display
  servicePrice: number;

  // Customer Info
  customerId?: string; // Optional for guest bookings
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerNotes?: string;

  // Timing
  date: string; // ISO date "2026-01-15"
  startTime: string; // "14:00"
  endTime: string; // "15:00"
  duration: number; // minutes

  // Status
  status: BookingStatus;

  // Metadata
  createdAt: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
}

// Helper to derive features from store type
export function getStoreFeaturesFromType(type: StoreType): StoreFeatures {
  switch (type) {
    case "product":
      return { hasProducts: true, hasServices: false, hasPreorders: false };
    case "service":
      return { hasProducts: false, hasServices: true, hasPreorders: false };
    case "hybrid":
      return { hasProducts: true, hasServices: true, hasPreorders: true };
    default:
      return { hasProducts: true, hasServices: false, hasPreorders: false };
  }
}
