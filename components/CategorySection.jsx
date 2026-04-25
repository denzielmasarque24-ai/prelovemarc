'use client';

import Link from 'next/link';
import './CategorySection.css';

export default function CategorySection() {
  const categories = [
    { name: 'Tops', image: '/images/category-tops.jpg' },
    { name: 'Bottoms', image: '/images/category-bottoms.jpg' },
    { name: 'Dresses', image: '/images/category-dresses.jpg' },
  ];

  return (
    <section className="category-section">
      <div className="category-container">
        <h2 className="section-title">Shop by Category</h2>
        <div className="category-grid">
          {categories.map((category) => (
            <Link
              href={`/shop?category=${category.name}`}
              key={category.name}
              className="category-card"
            >
              <div className="category-image-wrapper">
                <img
                  src={category.image}
                  alt={category.name}
                  className="category-image"
                />
              </div>
              <h3 className="category-name">{category.name}</h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
