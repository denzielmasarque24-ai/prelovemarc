"use client";

import { useId, useState } from "react";
import Image from "next/image";

interface ProductCardProps {
  image: string;
  name: string;
  price: number;
  category: string;
  description: string;
  onAddToCart: () => void;
}

export default function ProductCard({
  image,
  name,
  price,
  description,
  onAddToCart,
}: ProductCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const detailsId = useId();

  return (
    <article className="product-card boutique-card">
      <div className="product-image">
        <Image src={image} alt={name} width={500} height={620} />
      </div>
      <div className="product-body">
        <h3>{name}</h3>
        <span className="product-price">PHP {price.toLocaleString()}</span>
        <button
          type="button"
          className="product-details-toggle"
          aria-expanded={showDetails}
          aria-controls={detailsId}
          onClick={() => setShowDetails((current) => !current)}
        >
          {showDetails ? "Hide Details" : "View Details"}
        </button>
        <div
          id={detailsId}
          className={`product-details${showDetails ? " open" : ""}`}
          aria-hidden={!showDetails}
        >
          {description.split("\n").map((line, index) => (
            <p key={`${detailsId}-${index}`}>{line || "\u00A0"}</p>
          ))}
        </div>
        <button type="button" className="product-button" onClick={onAddToCart}>
          Add to Cart
        </button>
      </div>
    </article>
  );
}
