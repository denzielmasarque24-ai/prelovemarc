export type ProductCategory = "Tops" | "Bottoms" | "Dresses";

export interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
  category: ProductCategory;
  description: string;
}

export interface User {
  fullName: string;
  email: string;
  username: string;
  phoneNumber: string;
  password: string;
}

export interface SessionUser {
  fullName: string;
  username: string;
}

export interface CartItem extends Product {
  quantity: number;
}
