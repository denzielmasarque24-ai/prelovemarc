"use client";

import { supabase } from "@/lib/supabaseClient";
import type { CartItem } from "@/lib/types";

export type DeliveryOption = "pickup" | "delivery";
export type PaymentMethod = "gcash" | "paymaya" | "cod";

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
}

export async function placeCheckoutOrder(input: CheckoutOrderInput) {
  const orderId = crypto.randomUUID();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      id: orderId,
      user_id: session?.user?.id ?? null,
      customer_name: input.customerName,
      phone: input.phone,
      address: input.address,
      barangay: input.barangay,
      city: input.city,
      province: input.province,
      zip_code: input.zipCode,
      notes: input.notes?.trim() || null,
      payment_method: input.paymentMethod,
      delivery_option: input.deliveryOption,
      total: input.total,
      status: "pending",
    });

  if (orderError) {
    console.error("Failed to insert checkout order:", orderError);
    throw new Error(orderError.message);
  }

  const orderItems = input.items.map((item) => ({
    order_id: orderId,
    product_name: item.name,
    price: item.price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    console.error("Failed to insert checkout order items:", itemsError);
    throw new Error(itemsError.message);
  }

  return orderId;
}
