"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import CategoryCard from "@/components/CategoryCard";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { ensureBrowserSession } from "@/lib/auth";
import { requestAuthModal } from "@/lib/authModal";
import ProductCard from "@/components/ProductCard";
import { products } from "@/lib/products";
import { addToCart, getSession } from "@/lib/storage";
import type { ProductId } from "@/lib/types";

type ReaderMessage = {
  type: "success" | "error";
  text: string;
} | null;

export default function ReaderView() {
  const [message, setMessage] = useState<ReaderMessage>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const syncSessionState = () => {
      setIsSignedIn(Boolean(getSession()));
    };

    syncSessionState();
    void ensureBrowserSession().then(syncSessionState);

    window.addEventListener("session-updated", syncSessionState);
    window.addEventListener("storage", syncSessionState);

    return () => {
      window.removeEventListener("session-updated", syncSessionState);
      window.removeEventListener("storage", syncSessionState);
    };
  }, []);

  const openAuthModal = (mode: "login" | "register") => {
    console.log("Opening modal:", mode);
    requestAuthModal(mode);
  };

  const promptLogin = () => {
    setMessage({ type: "error", text: "Please log in to continue" });
    openAuthModal("login");
  };

  const handleAddToCart = async (productId: ProductId) => {
    const hasSession = await ensureBrowserSession();

    if (!hasSession) {
      promptLogin();
      return;
    }

    const product = products.find((item) => item.id === productId);

    if (!product) {
      return;
    }

    addToCart(product);
    setMessage({ type: "success", text: `${product.name} has been added to your cart.` });
    window.setTimeout(() => setMessage(null), 1600);
  };

  return (
    <div className="page-shell reader-page">
      <Navbar />

      <main className="page-content storefront-main">
        <section className="boutique-hero">
          <div className="hero-copy">
            <span className="eyebrow">Reader View</span>
            <h1>discover timeless pieces in soft violet light</h1>
            <p>browse tops, bottoms, and dresses freely before signing in to shop.</p>

            <div className="hero-actions">
              <a href="#products" className="button-primary hero-button">
                Shop Now
              </a>
              {!isSignedIn ? (
                <>
                  <button type="button" className="button-secondary auth-trigger" onClick={() => openAuthModal("login")}>
                    Log In
                  </button>
                  <button type="button" className="button-ghost auth-trigger" onClick={() => openAuthModal("register")}>
                    Register
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="hero-image-shell boutique-card">
            <Image
              src="/images/product5.jpg"
              alt="Curated boutique outfit on a hanger"
              width={760}
              height={900}
              priority
            />
          </div>
        </section>

        <section className="section-block boutique-section" id="categories">
          <div className="section-title">
            <h2>Categories</h2>
          </div>

          <div className="category-grid">
            <CategoryCard title="Tops" image="/images/product1.jpg" alt="Tops category" href="#products" />
            <CategoryCard title="Bottoms" image="/images/product3.jpg" alt="Bottoms category" href="#products" />
            <CategoryCard title="Dresses" image="/images/product6.jpg" alt="Dresses category" href="#products" />
          </div>
        </section>

        <section className="section-block boutique-section" id="products">
          <div className="section-title with-lines">
            <span className="title-line" />
            <h2>Featured Items</h2>
            <span className="title-line" />
          </div>

          {message ? (
            <div className={`message-banner ${message.type === "error" ? "error" : "success"}`}>
              {message.text}
            </div>
          ) : null}

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                image={product.image}
                name={product.name}
                price={product.price}
                category={product.category}
                description={product.description}
                onAddToCart={() => void handleAddToCart(product.id)}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
