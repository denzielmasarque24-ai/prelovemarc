"use client";

import { supabase } from "@/lib/supabaseClient";
import { normalizeOrderStatus } from "@/lib/orderStatus";
import type { CartItem, Order, ProductId } from "@/lib/types";

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

function isUuid(value: ProductId): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value)
  );
}

function getDatabaseCartItems(items: CartItem[]) {
  const quantityById = new Map<string, { quantity: number; name: string }>();

  for (const item of items) {
    if (!isUuid(item.id)) {
      continue;
    }

    const productId = item.id;
    const current = quantityById.get(productId);
    quantityById.set(productId, {
      name: item.name,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }

  return [...quantityById.entries()].map(([id, item]) => ({ id, ...item }));
}

async function getLiveStock(items: ReturnType<typeof getDatabaseCartItems>) {
  if (!items.length) {
    return new Map<string, { stock: number; name: string }>();
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, stock")
    .in("id", items.map((item) => item.id));

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data ?? []) as { id: string; name: string; stock: number | string | null }[]).map((product) => [
      product.id,
      {
        name: product.name,
        stock: Number(product.stock ?? 0),
      },
    ]),
  );
}

function assertStockAvailable(
  items: ReturnType<typeof getDatabaseCartItems>,
  stockById: Map<string, { stock: number; name: string }>,
) {
  for (const item of items) {
    const product = stockById.get(item.id);

    if (!product) {
      throw new Error(`${item.name} is no longer available.`);
    }

    if (product.stock <= 0) {
      throw new Error(`${product.name} is out of stock.`);
    }

    if (item.quantity > product.stock) {
      throw new Error(`Only ${product.stock} ${product.name} left in stock.`);
    }
  }
}

async function reduceProductStock(
  items: ReturnType<typeof getDatabaseCartItems>,
  stockById: Map<string, { stock: number; name: string }>,
) {
  const reducedItems: { id: string; stock: number }[] = [];

  try {
    for (const item of items) {
      const product = stockById.get(item.id);
      if (!product) continue;

      const nextStock = product.stock - item.quantity;
      const { data, error } = await supabase
        .from("products")
        .update({ stock: nextStock })
        .eq("id", item.id)
        .eq("stock", product.stock)
        .select("id")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(`${product.name} stock changed while placing your order. Please review your cart and try again.`);
      }

      reducedItems.push({ id: item.id, stock: product.stock });
    }
  } catch (error) {
    for (const item of reducedItems) {
      await supabase.from("products").update({ stock: item.stock }).eq("id", item.id);
    }

    throw error;
  }
}

async function removeSavedOrder(orderId: string) {
  await supabase.from("payments").delete().eq("order_id", orderId);
  await supabase.from("orders").delete().eq("id", orderId);
}

export async function placeCheckoutOrder(input: CheckoutOrderInput): Promise<string> {
  const orderId = crypto.randomUUID();
  const databaseItems = getDatabaseCartItems(input.items);
  const liveStockById = await getLiveStock(databaseItems);
  assertStockAvailable(databaseItems, liveStockById);

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
  if (itemsError) {
    await removeSavedOrder(orderId);
    throw new Error(itemsError.message);
  }

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

  try {
    await reduceProductStock(databaseItems, liveStockById);
  } catch (stockError) {
    await removeSavedOrder(orderId);
    throw stockError;
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
