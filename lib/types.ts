export type ProductCategory = "Tops" | "Bottoms" | "Dresses";
export type ProductId = number | string;

export interface Product {
  id: ProductId;
  name: string;
  price: number;
  image: string;
  category: ProductCategory;
  description: string;
}

export interface SessionUser {
  fullName: string;
  email: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
  created_at: string | null;
}

export interface CartItem extends Product {
  quantity: number;
}
