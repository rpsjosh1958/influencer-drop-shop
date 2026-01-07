export interface Order {
  id: string;
  storeId: string;
  storeName?: string;
  userId?: string;
  customerName?: string;
  email?: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  status:
    | "pending"
    | "paid"
    | "sent-out"
    | "delivered"
    | "completed"
    | "cancelled"
    | "refunded";
  createdAt: any; // Firestore Timestamp
  address?: Address;
  paymentMethod?: string;
  hasReview?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  imageUrl?: string;
  images?: string[];
  variant?: any;
}

export interface Address {
  street: string;
  city: string;
  country: string;
  zipCode: string;
}
