import { supabase } from "@/lib/supabaseClient";
import { products as fallbackProducts } from "@/lib/products";
import type { Product } from "@/lib/types";

type ProductRow = Record<string, unknown>;

const validCategories: Product["category"][] = ["Tops", "Bottoms", "Dresses"];

function normalizeProductRow(row: ProductRow) {
  const rawId = row.id;
  const id =
    typeof rawId === "number"
      ? rawId
      : typeof rawId === "string" && rawId.trim()
        ? rawId.trim()
        : null;

  if (id === null) {
    return null;
  }

  const fallbackProduct = fallbackProducts.find((product) => String(product.id) === String(id));
  const rawCategory = typeof row.category === "string" ? row.category : fallbackProduct?.category;
  const category = validCategories.includes(rawCategory as Product["category"])
    ? (rawCategory as Product["category"])
    : fallbackProduct?.category;

  if (!category) {
    return null;
  }

  const image =
    (typeof row.image === "string" && row.image) ||
    (typeof row.image_url === "string" && row.image_url) ||
    fallbackProduct?.image;

  const name =
    (typeof row.name === "string" && row.name) ||
    fallbackProduct?.name;

  const description =
    (typeof row.description === "string" && row.description) ||
    fallbackProduct?.description ||
    "";

  const priceValue =
    typeof row.price === "number"
      ? row.price
      : typeof row.price === "string"
        ? Number(row.price)
        : fallbackProduct?.price;

  if (!name || !image || !Number.isFinite(priceValue ?? NaN)) {
    return null;
  }

  return {
    id,
    name,
    price: priceValue as number,
    image,
    category,
    description,
  } satisfies Product;
}

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.warn("Failed to load products from Supabase, using local fallback:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return null;
  }

  const normalizedProducts = ((data as ProductRow[] | null) ?? []).reduce<Product[]>(
    (accumulator, row) => {
      const product = normalizeProductRow(row);

      if (product) {
        accumulator.push(product);
      }

      return accumulator;
    },
    [],
  );

  return normalizedProducts;
}
