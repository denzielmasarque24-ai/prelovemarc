"use client";

import { useId, useState } from "react";
import { formatPrice } from "@/lib/format";
import "./ProductCard.css";

interface ProductCardProps {
  image: string;
  name: string;
  price: number;
  category: string;
  description: string;
  onAddToCart: () => void;
}

const FALLBACK = "/images/logo.png";

function resolveImageSrc(raw: string): string {
  if (!raw || !raw.trim()) return FALLBACK;
  // already a full URL (Supabase storage, http, https)
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  // already a rooted path
  if (raw.startsWith("/")) return raw;
  // bare filename — assume it lives in /images/
  return `/images/${raw}`;
}

export default function ProductCard({
  image,
  name,
  price,
  description,
  onAddToCart,
}: ProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [imgSrc, setImgSrc] = useState(() => resolveImageSrc(image));
  const detailsId = useId();

  return (
    <article className="product-card">
      <div className="product-image-wrapper">
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

        <button
          type="button"
          className="product-details-toggle"
          aria-expanded={showDetails}
          aria-controls={detailsId}
          onClick={() => setShowDetails((v) => !v)}
        >
          {showDetails ? "Hide Details" : "View Details"}
        </button>

        <div
          id={detailsId}
          className={`product-details${showDetails ? " open" : ""}`}
          aria-hidden={!showDetails}
        >
          {description.split("\n").map((line, i) => (
            <p key={`${detailsId}-${i}`}>{line || "\u00A0"}</p>
          ))}
        </div>

        <button type="button" className="add-to-cart-btn" onClick={onAddToCart}>
          Add to Cart
        </button>
      </div>
    </article>
  );
}
