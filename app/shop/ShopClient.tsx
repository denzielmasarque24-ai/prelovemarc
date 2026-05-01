'use client';

import { useEffect, useState } from 'react';
import ProductGrid from '@/components/ProductGrid';
import { products as fallbackProducts } from '@/lib/products';
import { fetchProductsFromSupabase } from '@/lib/supabaseShop';
import type { Product, ProductCategory } from '@/lib/types';

const categories = ['All', 'Tops', 'Bottoms', 'Dresses'] as const;
type ShopCategory = (typeof categories)[number];

type ShopClientProps = { initialCategory: ShopCategory };

export default function ShopClient({ initialCategory }: ShopClientProps) {
  const [allProducts, setAllProducts] = useState<Product[]>(fallbackProducts);
  const [selectedCategory, setSelectedCategory] = useState<ShopCategory>(initialCategory);
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => { setSelectedCategory(initialCategory); }, [initialCategory]);

  useEffect(() => {
    fetchProductsFromSupabase().then((data) => {
      if (data && data.length > 0) setAllProducts(data);
    }).catch(() => null);
  }, []);

  const filteredProducts = allProducts.filter((p) => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchPrice = !maxPrice || p.price <= Number(maxPrice) * 100;
    return matchCategory && matchSearch && matchPrice;
  });

  return (
    <main className="shop-main">
      <p className="sr-only">Shop Page Working</p>

      <div className="shop-container">
        <h1 className="shop-title">Shop by Category</h1>

        <div className="shop-filters">
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

          <div className="shop-search-row">
            <input
              className="shop-search-input"
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <input
              className="shop-search-input"
              type="number"
              placeholder="Max price (₱)"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{ width: 140 }}
            />
          </div>
        </div>

        <div className="products-wrapper">
          <ProductGrid products={filteredProducts} />
        </div>

        {filteredProducts.length === 0 && (
          <div className="no-products">
            <p>No products found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
