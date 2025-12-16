export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  imagePath?: string; // For deletion
  stock: number;
  createdAt: number;
}
