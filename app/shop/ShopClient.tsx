'use client';

import { useEffect, useState } from 'react';
import ProductGrid from '@/components/ProductGrid';
import { fetchProductsFromSupabase } from '@/lib/supabaseShop';
import type { Product } from '@/lib/types';

const categories = ['all', 'tops', 'bottoms', 'dresses'] as const;
type ShopCategory = (typeof categories)[number];

const categoryLabels: Record<ShopCategory, string> = {
  all: 'All',
  tops: 'Tops',
  bottoms: 'Bottoms',
  dresses: 'Dresses',
};

type ShopClientProps = { initialCategory: ShopCategory };

export default function ShopClient({ initialCategory }: ShopClientProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>(initialCategory);
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { setSelectedCategory(initialCategory); }, [initialCategory]);

  useEffect(() => {
    setIsLoading(true);
    fetchProductsFromSupabase()
      .then((data) => setAllProducts(data ?? []))
      .catch((error) => {
        console.error('Failed to load shop products:', error);
        setAllProducts([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredProducts = allProducts.filter((p) => {
    const matchCategory = selectedCategory === 'all' || p.category.toLowerCase() === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchPrice = !maxPrice || p.price <= Number(maxPrice);
    return matchCategory && matchSearch && matchPrice;
  });

  return (
    <main className="shop-main">
      <p className="sr-only">Shop Page Working</p>

      <div className="shop-container">
        <div className="shop-filters">
          <div className="category-filter">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`filter-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>

          <div className="shop-search-row">
            <input
              className="shop-search-input"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="shop-search-input"
              type="number"
              placeholder="Max price (PHP)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
        </div>

        <div className="products-wrapper">
          <ProductGrid products={filteredProducts} />
        </div>

        {isLoading && (
          <div className="no-products">
            <p>Loading products...</p>
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="no-products">
            <p>No products found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
