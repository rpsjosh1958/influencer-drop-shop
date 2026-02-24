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
  createdAt: any;
}

export interface Order {
  id: string;
  customerName?: string;
  customerEmail: string;
  total: number;
  status: string;
  items: any[];
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
  createdAt: any;
  userId?: string;
  customerNote?: string;
  hasReview?: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  isAnonymous: boolean;
  rating: number;
  comment?: string;
  createdAt: any;
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
  createdAt: any;
  reply?: {
    message: string;
    createdAt: any;
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
  status: "live" | "closed";
  plan: "starter" | "growth";
  isVerified?: boolean;
  createdAt: any;
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
    recipientCode?: string;
  };
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
  createdAt: any;
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
  updatedAt?: any;
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
  createdAt: any;
  updatedAt?: any;
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
