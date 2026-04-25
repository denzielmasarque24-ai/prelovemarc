'use client';

import { useEffect, useState } from 'react';
import ProductGrid from '@/components/ProductGrid';
import { products as fallbackProducts } from '@/lib/products';
import { fetchProductsFromSupabase } from '@/lib/supabaseShop';
import type { Product, ProductCategory } from '@/lib/types';

const categories = ['All', 'Tops', 'Bottoms', 'Dresses'] as const;

type ShopCategory = (typeof categories)[number];

function getProductsByCategory(category: ShopCategory): Product[] {
  if (category === 'All') {
    return fallbackProducts;
  }

  return fallbackProducts.filter((product) => product.category === category);
}

type ShopClientProps = {
  initialCategory: ShopCategory;
};

export default function ShopClient({ initialCategory }: ShopClientProps) {
  const [allProducts, setAllProducts] = useState<Product[]>(fallbackProducts);
  const [selectedCategory, setSelectedCategory] =
    useState<ShopCategory>(initialCategory);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(
    initialCategory === 'All'
      ? fallbackProducts
      : fallbackProducts.filter((product) => product.category === initialCategory),
  );

  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    const loadProducts = async () => {
      const supabaseProducts = await fetchProductsFromSupabase();

      if (supabaseProducts && supabaseProducts.length > 0) {
        setAllProducts(supabaseProducts);
      }
    };

    void loadProducts();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredProducts(allProducts);
      return;
    }

    setFilteredProducts(allProducts.filter((product) => product.category === selectedCategory));
  }, [allProducts, selectedCategory]);

  return (
    <main className="shop-main">
      <p className="sr-only">Shop Page Working</p>

      <div className="shop-container">
        <h1 className="shop-title">Shop by Category</h1>

        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="products-wrapper">
          <ProductGrid products={filteredProducts} />
        </div>

        {filteredProducts.length === 0 ? (
          <div className="no-products">
            <p>No products found in this category.</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
