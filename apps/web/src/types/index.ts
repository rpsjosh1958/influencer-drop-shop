export interface ProductVariant {
  id: string;
  name: string; // e.g. "Red / L" or just "Red"
  color?: string; // "Red"
  colorCode?: string; // "#ff0000"
  size?: string; // "L"
  stock: number;
  price?: number; // Optional override
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

  // Stock (Total stock if variants exist)
  stock: number;
  createdAt: number;
  category?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: any;
}
