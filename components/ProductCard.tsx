"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/format";
import type { ProductId } from "@/lib/types";
import "./ProductCard.css";

interface ProductCardProps {
  id: ProductId;
  image: string;
  name: string;
  price: number;
  category: string;
  description: string;
  stock?: number;
  isDetailsOpen: boolean;
  onToggleDetails: (productId: ProductId) => void;
  onAddToCart: () => void;
}

const FALLBACK = "/images/logo.png";

function resolveImageSrc(raw: string): string {
  if (!raw || !raw.trim()) return FALLBACK;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return raw;
  return `/images/${raw}`;
}

export default function ProductCard({
  id,
  image,
  name,
  price,
  description,
  stock,
  isDetailsOpen,
  onToggleDetails,
  onAddToCart,
}: ProductCardProps) {
  const [imgSrc, setImgSrc] = useState(() => resolveImageSrc(image));
  const detailsId = useId();

  const hasStockValue = typeof stock === "number";
  const outOfStock = hasStockValue && stock <= 0;

  return (
    <article className="product-card">
      <div className="product-image-wrapper">
        {outOfStock && <div className="product-out-of-stock-overlay">Out of Stock</div>}
        <img
          src={imgSrc}
          alt={name}
          className="product-image"
          onError={() => setImgSrc(FALLBACK)}
        />
      </div>

      <div className="product-info">
        <h3 className="product-name">{name}</h3>
        <p className="product-price">{formatPrice(price)}</p>

        {hasStockValue && (
          <p className={`product-stock${outOfStock ? " product-stock-empty" : ""}`}>
            {outOfStock ? "No Stock" : stock}
          </p>
        )}

        <button
          type="button"
          className="product-details-toggle"
          aria-expanded={isDetailsOpen}
          aria-controls={detailsId}
          onClick={() => onToggleDetails(id)}
        >
          {isDetailsOpen ? "Hide Details" : "View Details"}
        </button>

        <div
          id={detailsId}
          className={`product-details${isDetailsOpen ? " open" : ""}`}
          aria-hidden={!isDetailsOpen}
        >
          {description.split("\n").map((line, i) => (
            <p key={`${detailsId}-${i}`}>{line || "\u00A0"}</p>
          ))}
        </div>

        <button
          type="button"
          className={`add-to-cart-btn${outOfStock ? " out-of-stock" : ""}`}
          onClick={outOfStock ? undefined : onAddToCart}
          disabled={outOfStock}
          aria-disabled={outOfStock}
        >
          {outOfStock ? "Out of Stock" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
}
