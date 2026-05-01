"use client";

import { supabase } from "@/lib/supabaseClient";
import type { ContactMessage, Order, OrderStatus, Product, Profile } from "@/lib/types";

type ProductRow = Record<string, unknown>;

const fallbackProductImage = "/images/logo.png";
const validCategories: Product["category"][] = ["Tops", "Bottoms", "Dresses"];

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeProduct(row: ProductRow): Product {
  const rawCategory = readString(row.category, "Tops");
  const category = validCategories.includes(rawCategory as Product["category"])
    ? (rawCategory as Product["category"])
    : "Tops";

  const rawPrice = typeof row.price === "number" ? row.price : Number(row.price);
  const rawStock = typeof row.stock === "number" ? row.stock : Number(row.stock);
  const rawStatus = readString(row.status, "active");

  return {
    id: typeof row.id === "string" || typeof row.id === "number" ? row.id : "",
    name: readString(row.name, "Untitled product"),
    price: Number.isFinite(rawPrice) ? rawPrice : 0,
    image: readString(row.image_url, readString(row.image, fallbackProductImage)),
    category,
    description: readString(row.description),
    size: readString(row.size),
    color: readString(row.color),
    stock: Number.isFinite(rawStock) ? rawStock : 0,
    status: rawStatus === "inactive" ? "inactive" : "active",
  };
}

export async function adminGetAllOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

export async function adminUpdateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw new Error(error.message);
}

export async function adminGetAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

export async function adminGetAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as ProductRow[]).map(normalizeProduct);
}

export async function adminUpsertProduct(product: Partial<Product> & { id?: string | number }) {
  const payload = {
    name: product.name,
    price: product.price,
    image_url: product.image,
    category: product.category,
    description: product.description,
    size: product.size ?? "",
    color: product.color ?? "",
    stock: product.stock ?? 0,
    status: product.status ?? "active",
  };

  if (product.id) {
    const { error } = await supabase.from("products").update(payload).eq("id", product.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("products").insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function adminDeleteProduct(productId: string | number) {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
}

export async function adminGetMessages(): Promise<ContactMessage[]> {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessage[];
}

export async function adminMarkMessageRead(messageId: string) {
  const { error } = await supabase
    .from("contact_messages")
    .update({ is_read: true })
    .eq("id", messageId);
  if (error) throw new Error(error.message);
}

export async function adminGetDashboardStats() {
  const [ordersRes, usersRes, productsRes, messagesRes] = await Promise.all([
    supabase.from("orders").select("id, total, status, created_at"),
    supabase.from("profiles").select("id"),
    supabase.from("products").select("id"),
    supabase.from("contact_messages").select("id, is_read"),
  ]);

  const orders = (ordersRes.data ?? []) as { id: string; total: number; status: string; created_at: string }[];
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total, 0);

  return {
    totalOrders: orders.length,
    totalRevenue,
    totalUsers: (usersRes.data ?? []).length,
    totalProducts: (productsRes.data ?? []).length,
    unreadMessages: (messagesRes.data ?? []).filter((m: { is_read: boolean }) => !m.is_read).length,
    recentOrders: orders.slice(0, 5),
  };
}
