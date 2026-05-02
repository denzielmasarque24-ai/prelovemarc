'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';
import { useCart } from '@/context/CartContext';
import { Product, ProductId } from '@/lib/types';
import './ProductGrid.css';

type ProductGridProps = {
  products: Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  const { addToCart } = useCart();
  const [expandedProductId, setExpandedProductId] = useState<ProductId | null>(null);

  const handleToggleDetails = (productId: ProductId) => {
    setExpandedProductId((currentId) => (currentId === productId ? null : productId));
  };

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          image={product.image}
          name={product.name}
          price={product.price}
          category={product.category}
          description={product.description}
          stock={product.stock}
          isDetailsOpen={expandedProductId === product.id}
          onToggleDetails={handleToggleDetails}
          onAddToCart={() => addToCart(product)}
        />
      ))}
    </div>
  );
}
