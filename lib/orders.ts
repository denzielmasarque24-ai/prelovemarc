"use client";

import { supabase } from "@/lib/supabaseClient";
import { normalizeOrderStatus } from "@/lib/orderStatus";
import type { CartItem, Order } from "@/lib/types";

export type DeliveryOption = "pickup" | "delivery";
export type PaymentMethod = "gcash" | "bank_transfer" | "cod";

export interface CheckoutOrderInput {
  customerName: string;
  phone: string;
  address: string;
  barangay: string | null;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  notes?: string;
  paymentMethod: PaymentMethod;
  deliveryOption: DeliveryOption;
  total: number;
  items: CartItem[];
  referenceNumber?: string;
  paymentProof?: string;
}

export async function placeCheckoutOrder(input: CheckoutOrderInput): Promise<string> {
  const orderId = crypto.randomUUID();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) throw new Error(sessionError.message);

  const userId = session?.user?.id ?? null;

  const { error: orderError } = await supabase.from("orders").insert({
    id: orderId,
    user_id: userId,
    customer_name: input.customerName,
    phone: input.phone,
    address: input.address,
    barangay: input.barangay,
    city: input.city,
    province: input.province,
    zip_code: input.zipCode,
    notes: input.notes?.trim() || null,
    payment_method: input.paymentMethod,
    delivery_option: input.deliveryOption,   // ← always saved, never null
    total: input.total,
    status: normalizeOrderStatus("pending"),
    reference_number: input.referenceNumber ?? null,
    payment_proof: input.paymentProof ?? null,
  });

  if (orderError) throw new Error(orderError.message);

  const orderItems = input.items.map((item) => ({
    order_id: orderId,
    product_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) throw new Error(itemsError.message);

  // Insert payment record — always in sync with the order
  const paymentStatus = input.paymentMethod === "cod" ? "pending" : "completed";
  const { error: paymentError } = await supabase.from("payments").insert({
    id: crypto.randomUUID(),
    order_id: orderId,
    user_id: userId,
    customer_name: input.customerName,
    payment_method: input.paymentMethod,
    amount: input.total,
    payment_status: paymentStatus,
    proof_of_payment: input.paymentProof ?? null,
    reference_number: input.referenceNumber ?? null,
  });

  // Log but do not throw — order is already saved, payment record is secondary
  if (paymentError) {
    console.error("Failed to insert payment record:", paymentError.message);
  }

  return orderId;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}
