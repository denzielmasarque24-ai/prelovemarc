import { supabase } from "@/lib/supabaseClient";
import type { Product } from "@/lib/types";

type ProductRow = Record<string, unknown>;

const validCategories: Product["category"][] = ["tops", "bottoms", "dresses"];

function normalizeCategory(value: unknown): Product["category"] | null {
  if (typeof value !== "string") return null;

  const category = value.trim().toLowerCase();
  return validCategories.includes(category as Product["category"])
    ? (category as Product["category"])
    : null;
}

function isActiveProduct(row: ProductRow) {
  const status = typeof row.status === "string" ? row.status.trim().toLowerCase() : "active";
  return status === "active";
}

function normalizeProductRow(row: ProductRow) {
  const rawId = row.id;
  const id =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string" && rawId.trim()
        ? rawId.trim()
        : null;

  if (id === null) return null;

  const category = normalizeCategory(row.category);
  if (!category) return null;

  const image =
    (typeof row.image === "string" && row.image.trim()) ||
    (typeof row.image_url === "string" && row.image_url.trim());

  const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : null;

  const description =
    typeof row.description === "string" && row.description.trim()
      ? row.description.trim()
      : "";

  const priceValue =
    typeof row.price === "number"
      ? row.price
      : typeof row.price === "string"
        ? Number(row.price)
        : null;

  if (!name || !image || !Number.isFinite(priceValue ?? NaN)) return null;

  return {
    id,
    name,
    price: priceValue as number,
    image,
    category,
    description,
    stock: typeof row.stock === "number" ? row.stock : Number(row.stock ?? 0),
  } satisfies Product;
}

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load products from Supabase:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  return ((data as ProductRow[] | null) ?? []).reduce<Product[]>((accumulator, row) => {
    if (!isActiveProduct(row)) return accumulator;

    const product = normalizeProductRow(row);
    if (product) accumulator.push(product);

    return accumulator;
  }, []);
}
