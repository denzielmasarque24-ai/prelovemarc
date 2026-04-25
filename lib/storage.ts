"use client";

import { supabase } from "@/lib/supabaseClient";
import { CartItem, Product, ProductId, SessionUser } from "@/lib/types";

const SESSION_KEY = "rosette-session";
const CART_KEY = "rosette-cart";

const isBrowser = () => typeof window !== "undefined";

function readJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) {
    return fallback;
  }

  const value = window.localStorage.getItem(key);

  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function storeCartLocally(cart: CartItem[], shouldDispatch = true) {
  writeJSON(CART_KEY, cart);

  if (shouldDispatch) {
    dispatchUpdate("cart-updated");
  }
}

function dispatchUpdate(eventName: string) {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(eventName));
}

function isUuid(value: ProductId) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function readStringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

async function getSupabaseUserId() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to read Supabase user for cart sync:", error);
    return null;
  }

  return session?.user?.id ?? null;
}

async function resolveSupabaseCartItems(cart: CartItem[]) {
  const unresolvedItems = cart.filter((item) => !isUuid(item.id));

  if (!unresolvedItems.length) {
    return cart;
  }

  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    console.warn("Unable to resolve Supabase product IDs for cart sync; keeping local cart only.", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return cart;
  }

  const rows = ((data ?? []) as Record<string, unknown>[])
    .map((row) => {
      const id = row.id;

      if (!isUuid(typeof id === "string" ? id : "")) {
        return null;
      }

      return {
        id,
        name: readStringField(row, ["name", "product_name", "title"]),
        image: readStringField(row, ["image", "image_url", "photo", "photo_url"]),
      };
    })
    .filter((row): row is { id: string; name: string | null; image: string | null } => Boolean(row));

  const byName = new Map(rows.filter((row) => row.name).map((row) => [row.name as string, row.id]));
  const byImage = new Map(rows.filter((row) => row.image).map((row) => [row.image as string, row.id]));

  let hasChanges = false;
  const upgradedCart = cart.map((item) => {
    if (isUuid(item.id)) {
      return item;
    }

    const resolvedId = byName.get(item.name) ?? byImage.get(item.image);

    if (!resolvedId) {
      return item;
    }

    hasChanges = true;
    return {
      ...item,
      id: resolvedId,
    };
  });

  if (hasChanges) {
    storeCartLocally(upgradedCart);
  }

  return upgradedCart;
}

async function syncCartToSupabase(cart: CartItem[]) {
  const userId = await getSupabaseUserId();

  if (!userId) {
    return;
  }

  const resolvedCart = await resolveSupabaseCartItems(cart);
  const syncedItems = resolvedCart.filter((item) => isUuid(item.id));

  if (!cart.length) {
    const { error: deleteError } = await supabase
      .from("cart_items")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Failed clearing cart_items before sync:", deleteError);
    }

    return;
  }

  if (!syncedItems.length) {
    return;
  }

  const { error: deleteError } = await supabase
    .from("cart_items")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    console.error("Failed clearing cart_items before sync:", deleteError);
    return;
  }

  const payload = syncedItems.map((item) => ({
    user_id: userId,
    product_id: item.id,
    quantity: item.quantity,
  }));

  const { error: insertError } = await supabase.from("cart_items").insert(payload);

  if (insertError) {
    console.error("Failed syncing cart_items to Supabase:", insertError);
  }
}

export async function hydrateCartFromSupabase() {
  const userId = await getSupabaseUserId();
  const localCart = getCart();

  if (!userId) {
    return localCart;
  }

  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("product_id, quantity")
    .eq("user_id", userId);

  if (cartError) {
    console.error("Failed loading cart_items from Supabase:", cartError);
    return localCart;
  }

  const rows = (cartRows ?? []) as { product_id: string; quantity: number }[];

  if (!rows.length) {
    return localCart;
  }

  const productIds = rows.map((row) => row.product_id);
  const { data: productRows, error: productsError } = await supabase
    .from("products")
    .select("id, name, price, image, category, description")
    .in("id", productIds);

  if (productsError) {
    console.error("Failed loading products for cart_items:", productsError);
    return localCart;
  }

  const products = (productRows ?? []) as Product[];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const cart = rows
    .map((row) => {
      const product = productMap.get(row.product_id);

      if (!product) {
        return null;
      }

      return {
        ...product,
        quantity: row.quantity,
      };
    })
    .filter((item): item is CartItem => Boolean(item));

  if (!cart.length) {
    return localCart;
  }

  const localOnlyItems = localCart.filter((item) => !isUuid(item.id));
  const mergedCart = [...cart, ...localOnlyItems];

  saveCart(mergedCart);
  return mergedCart;
}

export function setSession(user: SessionUser) {
  writeJSON(SESSION_KEY, user);
  dispatchUpdate("session-updated");
}

export function getSession() {
  return readJSON<SessionUser | null>(SESSION_KEY, null);
}

export function clearSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
  dispatchUpdate("session-updated");
}

export function getCart() {
  return readJSON<CartItem[]>(CART_KEY, []);
}

export function saveCart(cart: CartItem[]) {
  storeCartLocally(cart);
  void syncCartToSupabase(cart);
}

export function addToCart(product: Product) {
  const cart = getCart();
  const existingItem = cart.find((item) => item.id === product.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
}

export function removeFromCart(productId: ProductId) {
  const updatedCart = getCart().filter((item) => item.id !== productId);
  saveCart(updatedCart);
}

export function clearCart() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(CART_KEY);
  dispatchUpdate("cart-updated");
  void syncCartToSupabase([]);
}
