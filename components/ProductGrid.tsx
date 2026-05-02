'use client';

import ProductCard from './ProductCard';
import { useCart } from '@/context/CartContext';
import { Product } from '@/lib/types';
import './ProductGrid.css';

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  const { addToCart } = useCart();

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          image={product.image}
          name={product.name}
          price={product.price}
          category={product.category}
          description={product.description}
          stock={product.stock}
          onAddToCart={() => addToCart(product)}
        />
      ))}
    </div>
  );
}
