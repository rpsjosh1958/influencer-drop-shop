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
}
