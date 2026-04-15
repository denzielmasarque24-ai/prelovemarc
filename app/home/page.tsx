"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/products";
import { addToCart, getSession } from "@/lib/storage";
import { ProductCategory } from "@/lib/types";

type FilterOption = "All" | ProductCategory;

const categories: ProductCategory[] = ["Tops", "Bottoms", "Dresses"];

export default function HomePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<FilterOption>("All");
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
    }
  }, [router]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      const matchesSearch = `${product.name} ${product.description}`
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const handleAddToCart = (productId: number) => {
    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    addToCart(product);
    setFeedback(`${product.name} has been added to your cart.`);

    window.setTimeout(() => {
      setFeedback("");
    }, 1600);
  };

  return (
    <div className="page-shell">
      <Navbar />

      <main className="page-content">
        <section className="hero-grid">
          <div className="hero-panel">
            <div className="hero-copy">
              <span className="eyebrow">Softly Styled Collection</span>
              <h1>Find your sweetest look in every pastel layer.</h1>
              <p>
                Discover charming tops, polished bottoms, and dreamy dresses
                carefully selected for a graceful boutique experience.
              </p>
            </div>

            <div className="hero-actions">
              <a href="#products" className="button-primary">
                Shop now
              </a>
              <a href="#categories" className="button-secondary">
                Browse categories
              </a>
            </div>

            <div className="hero-highlights">
              <div>
                <strong>Soft Palette</strong>
                <span>Pastel pink, violet, cream, and pearly white tones.</span>
              </div>
              <div>
                <strong>Easy Cart</strong>
                <span>Simple localStorage cart perfect for beginner projects.</span>
              </div>
              <div>
                <strong>Responsive</strong>
                <span>Designed to look neat on both mobile and desktop.</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="image-stack">
              <div className="hero-image-card">
                <Image
                  src="/images/product1.jpg"
                  alt="Featured boutique style"
                  width={480}
                  height={560}
                />
              </div>
              <div className="hero-image-card">
                <Image
                  src="/images/product5.jpg"
                  alt="Pastel dress display"
                  width={480}
                  height={560}
                />
              </div>
            </div>
            <div className="stat-grid">
              <div className="stat-card">
                <strong>6 Signature Pieces</strong>
                <span>Ready to explore in the starter collection.</span>
              </div>
              <div className="stat-card">
                <strong>3 Categories</strong>
                <span>Tops, bottoms, and dresses in boutique style.</span>
              </div>
              <div className="stat-card">
                <strong>Elegant Flow</strong>
                <span>Search, filter, add to cart, and checkout with ease.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-block" id="categories">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shop by Category</span>
              <h2>Curated clothing for every soft aesthetic.</h2>
            </div>
            <p>Pick a style direction and build your favorite pastel outfit.</p>
          </div>

          <div className="category-grid">
            {categories.map((category) => (
              <article key={category} className="category-card">
                <span>{category}</span>
                <h3>{category}</h3>
                <p>
                  {category === "Tops"
                    ? "Sweet blouses and delicate layers with polished details."
                    : category === "Bottoms"
                      ? "Flowy skirts and tailored pieces for elegant balance."
                      : "Boutique dresses with romantic silhouettes and soft charm."}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">New Arrivals</span>
              <h2>Our boutique favorites</h2>
            </div>
            <p>Use the search and filters below to find your perfect piece.</p>
          </div>

          <div className="filter-bar">
            <input
              type="text"
              className="search-input"
              placeholder="Search products by name or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="filter-actions">
              {(["All", ...categories] as FilterOption[]).map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`category-pill ${
                    selectedCategory === category ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {feedback ? <div className="message-banner success">{feedback}</div> : null}

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                image={product.image}
                name={product.name}
                price={product.price}
                category={product.category}
                description={product.description}
                onAddToCart={() => handleAddToCart(product.id)}
              />
            ))}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              No products matched your search. Try another keyword or category.
            </div>
          ) : null}
        </section>
      </main>

      <Footer />
    </div>
  );
}
