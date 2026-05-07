"use client";

import { supabase } from "@/lib/supabaseClient";
import { isFulfilledOrderStatus, normalizeOrderStatus } from "@/lib/orderStatus";
import type { ContactMessage, Order, OrderItem, OrderStatus, Product, Profile } from "@/lib/types";

type ProductRow = Record<string, unknown>;

const fallbackProductImage = "/images/logo.png";
const validCategories: Product["category"][] = ["tops", "bottoms", "dresses"];

type StockOrderItem = Pick<OrderItem, "id" | "product_id" | "product_name" | "quantity">;
type StockOrderRow = Pick<Order, "id" | "status" | "stock_deducted"> & {
  order_items?: StockOrderItem[] | null;
};
type StockProductRow = {
  id: string;
  name: string;
  stock: number | string | null;
};
type StockDeductionResult = {
  order_id: string;
  status: string;
  stock_deducted: boolean;
  deductions?: {
    product_id: string;
    product_name: string;
    current_stock: number;
    ordered_quantity: number;
    new_stock: number;
  }[];
};

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeProduct(row: ProductRow): Product {
  const rawCategory = readString(row.category, "tops").toLowerCase();
  const category = validCategories.includes(rawCategory as Product["category"])
    ? (rawCategory as Product["category"])
    : "tops";

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
  const nextStatus = normalizeOrderStatus(status);
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, stock_deducted, order_items(id, product_id, product_name, quantity)")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw new Error(orderError.message);
  if (!order) throw new Error("Order not found.");

  const stockOrder = order as StockOrderRow;
  const stockDeducted = stockOrder.stock_deducted === true;

  console.log("Admin order status update:", {
    orderId,
    nextStatus,
    stock_deducted: stockDeducted,
  });

  if (!isFulfilledOrderStatus(nextStatus) || stockDeducted) {
    const { error } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Order status update error:", {
        orderId,
        stock_deducted: stockDeducted,
        updateError: error,
      });
      throw new Error(error.message);
    }

    return { ...stockOrder, status: nextStatus } as Order;
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc("deduct_order_stock_on_fulfillment", {
    target_order_id: orderId,
    next_order_status: nextStatus,
  });

  if (!rpcError) {
    const deductionResult = rpcResult as StockDeductionResult | null;
    for (const deduction of deductionResult?.deductions ?? []) {
      console.log("Deducted product stock after fulfilled order:", {
        orderId,
        productId: deduction.product_id,
        currentStock: deduction.current_stock,
        orderedQuantity: deduction.ordered_quantity,
        newStock: deduction.new_stock,
        stock_deducted: deductionResult?.stock_deducted ?? true,
      });
    }

    console.log("Order stock deduction completed:", {
      orderId,
      stock_deducted: deductionResult?.stock_deducted ?? true,
    });

    const { data: updatedOrder, error: updatedOrderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .maybeSingle();

    if (updatedOrderError) throw new Error(updatedOrderError.message);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("product-stock-updated"));
    }

    return (updatedOrder ?? { ...stockOrder, status: nextStatus, stock_deducted: true }) as Order;
  }

  const rpcMessage = rpcError.message?.toLowerCase() ?? "";
  const rpcMissing = rpcMessage.includes("deduct_order_stock_on_fulfillment") || rpcError.code === "PGRST202";

  if (!rpcMissing) {
    console.error("Fulfilled-order stock deduction RPC error:", {
      orderId,
      stock_deducted: stockDeducted,
      updateError: rpcError,
    });
    throw new Error(rpcError.message);
  }

  console.warn(
    "Supabase function deduct_order_stock_on_fulfillment is missing. Falling back to client-side stock deduction. Run data/fix-order-stock-deduction-on-fulfillment.sql in Supabase.",
  );

  const groupedItems = new Map<string, { quantity: number; names: string[] }>();

  for (const item of stockOrder.order_items ?? []) {
    if (!item.product_id) {
      console.error("Order item missing product_id for stock deduction:", {
        orderId,
        orderItemId: item.id,
        productName: item.product_name,
        orderedQuantity: item.quantity,
        stock_deducted: stockDeducted,
      });
      throw new Error(`${item.product_name} is missing a product ID, so stock cannot be deducted safely.`);
    }

    const current = groupedItems.get(item.product_id);
    groupedItems.set(item.product_id, {
      quantity: (current?.quantity ?? 0) + item.quantity,
      names: [...(current?.names ?? []), item.product_name],
    });
  }

  if (!groupedItems.size) {
    throw new Error("This order has no items to deduct from stock.");
  }

  const productIds = [...groupedItems.keys()];
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, stock")
    .in("id", productIds);

  if (productsError) throw new Error(productsError.message);

  const productMap = new Map(
    ((products ?? []) as StockProductRow[]).map((product) => [
      product.id,
      {
        name: product.name,
        stock: Number(product.stock ?? 0),
      },
    ]),
  );

  for (const [productId, item] of groupedItems) {
    const product = productMap.get(productId);
    if (!product) {
      throw new Error(`${item.names[0]} is no longer available.`);
    }

    if (item.quantity > product.stock) {
      console.error("Insufficient stock for completed order:", {
        orderId,
        productId,
        currentStock: product.stock,
        orderedQuantity: item.quantity,
        newStock: product.stock - item.quantity,
        stock_deducted: stockDeducted,
      });
      throw new Error(`Only ${product.stock} ${product.name} left in stock. Stock was not deducted.`);
    }
  }

  const deductedProducts: { id: string; oldStock: number }[] = [];

  try {
    for (const [productId, item] of groupedItems) {
      const product = productMap.get(productId);
      if (!product) continue;

      const newStock = product.stock - item.quantity;
      console.log("Deducting product stock after fulfilled order:", {
        orderId,
        productId,
        currentStock: product.stock,
        orderedQuantity: item.quantity,
        newStock,
        stock_deducted: stockDeducted,
      });

      const { data, error } = await supabase
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId)
        .eq("stock", product.stock)
        .select("id")
        .maybeSingle();

      if (error) {
        console.error("Product stock update error:", {
          orderId,
          productId,
          currentStock: product.stock,
          orderedQuantity: item.quantity,
          newStock,
          stock_deducted: stockDeducted,
          updateError: error,
        });
        throw new Error(error.message);
      }

      if (!data) {
        console.error("Product stock update conflict:", {
          orderId,
          productId,
          currentStock: product.stock,
          orderedQuantity: item.quantity,
          newStock,
          stock_deducted: stockDeducted,
          updateError: "No product row matched the expected id and old stock.",
        });
        throw new Error(`${product.name} stock changed. Please refresh and try again.`);
      }

      deductedProducts.push({ id: productId, oldStock: product.stock });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ status: nextStatus, stock_deducted: true })
      .eq("id", orderId)
      .eq("stock_deducted", false)
      .select("*, order_items(*)")
      .maybeSingle();

    if (updateError) {
      console.error("Order stock_deducted update error:", {
        orderId,
        stock_deducted: stockDeducted,
        updateError,
      });
      throw new Error(updateError.message);
    }

    if (!updatedOrder) {
      throw new Error("Stock deduction was already completed for this order.");
    }

    console.log("Order stock deduction completed:", {
      orderId,
      stock_deducted: true,
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("product-stock-updated"));
    }

    return updatedOrder as Order;
  } catch (error) {
    for (const product of deductedProducts) {
      console.warn("Rolling back product stock after fulfilled-order deduction failure:", {
        orderId,
        productId: product.id,
        restoredStock: product.oldStock,
      });
      await supabase.from("products").update({ stock: product.oldStock }).eq("id", product.id);
    }

    throw error;
  }
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
    supabase.from("orders").select("id, total, status, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("id"),
    supabase.from("products").select("id"),
    supabase.from("contact_messages").select("id, is_read"),
  ]);

  const orders = (ordersRes.data ?? []) as { id: string; total: number; status: string; created_at: string }[];
  const messages = (messagesRes.data ?? []) as { id: string; is_read: boolean }[];

  // Revenue = sum of fulfilled orders (consistent with Reports page)
  const totalRevenue = orders
    .filter((o) => isFulfilledOrderStatus(o.status))
    .reduce((sum, o) => sum + o.total, 0);

  return {
    totalOrders: orders.length,
    totalPayments: orders.length, // one payment per order
    totalRevenue,
    totalUsers: (usersRes.data ?? []).length,
    totalProducts: (productsRes.data ?? []).length,
    unreadMessages: messages.filter((m) => !m.is_read).length,
    recentOrders: orders.slice(0, 5),
  };
}
