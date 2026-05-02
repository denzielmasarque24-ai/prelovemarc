export function formatPrice(price: number | null | undefined): string {
  return `₱${Number(price ?? 0).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}
