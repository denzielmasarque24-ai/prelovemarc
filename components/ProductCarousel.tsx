"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { products } from "@/lib/products";
import styles from "./ProductCarousel.module.css";

const carouselProducts = products.slice(0, 3).map((product) => ({
  id: product.id,
  name: product.name,
  image: product.image,
}));

export default function ProductCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % carouselProducts.length);
    }, 4000);

    return () => window.clearInterval(timer);
  }, [isPaused]);

  const showPrevious = () => {
    setActiveIndex(
      (current) => (current - 1 + carouselProducts.length) % carouselProducts.length,
    );
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % carouselProducts.length);
  };

  return (
    <section
      className={styles.carouselSection}
      aria-label="Featured boutique picks"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className={styles.carouselShell}>
        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonLeft}`}
          onClick={showPrevious}
          aria-label="Show previous item"
        >
          <span aria-hidden="true">&lt;</span>
        </button>

        <div className={styles.viewport}>
          <div
            className={styles.track}
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {carouselProducts.map((product) => (
              <article className={styles.slide} key={product.id}>
                <div className={styles.imageWrap}>
                  <Image
                    src={product.image}
                    alt={product.name}
                    width={520}
                    height={620}
                    className={styles.productImage}
                  />
                </div>
              </article>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonRight}`}
          onClick={showNext}
          aria-label="Show next item"
        >
          <span aria-hidden="true">&gt;</span>
        </button>
      </div>

      <div className={styles.dots} aria-label="Carousel slide controls">
        {carouselProducts.map((product, index) => (
          <button
            type="button"
            key={product.id}
            className={`${styles.dot}${activeIndex === index ? ` ${styles.dotActive}` : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show ${product.name}`}
            aria-current={activeIndex === index ? "true" : undefined}
          />
        ))}
      </div>
    </section>
  );
}
