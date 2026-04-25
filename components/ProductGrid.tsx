'use client';

import ProductCard from './ProductCard';
import { addToCart } from '@/lib/storage';
import { Product } from '@/lib/types';

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
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
          onAddToCart={() => addToCart(product)}
        />
      ))}
    </div>
  );
}
