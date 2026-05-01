export type ProductCategory = "Tops" | "Bottoms" | "Dresses";
export type ProductId = number | string;
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface Product {
  id: ProductId;
  name: string;
  price: number;
  image: string;
  category: ProductCategory;
  description: string;
  size?: string;
  color?: string;
  stock?: number;
  status?: "active" | "inactive";
}

export interface SessionUser {
  fullName: string;
  email: string;
  role?: string;
}

export interface Profile {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  avatar?: string | null;
  address?: string | null;
  role?: string | null;
  created_at?: string | null;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  user_id?: string | null;
  customer_name: string;
  phone: string;
  address: string;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  zip_code?: string | null;
  notes?: string | null;
  payment_method: string;
  delivery_option: string;
  total: number;
  status: OrderStatus;
  reference_number?: string | null;
  payment_proof?: string | null;
  created_at?: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  price: number;
  quantity: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject?: string | null;
  message: string;
  is_read?: boolean;
  created_at?: string;
}
