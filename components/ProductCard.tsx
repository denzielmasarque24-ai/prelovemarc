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
  category,
  description,
  onAddToCart,
}: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-image">
        <Image src={image} alt={name} width={500} height={620} priority={false} />
      </div>
      <div className="product-body">
        <span className="product-tag">{category}</span>
        <div className="product-topline">
          <h3>{name}</h3>
          <span className="product-price">₱{price.toLocaleString()}</span>
        </div>
        <p>{description}</p>
        <button type="button" className="product-button" onClick={onAddToCart}>
          Add to Cart
        </button>
      </div>
    </article>
  );
}
