'use client';

import Link from 'next/link';
import './HeroSection.css';

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="hero-container">
        <div className="hero-content">
          <p className="hero-text">give clothes a second chance.</p>
          <Link href="/shop" className="hero-button">
            shop now
          </Link>
        </div>
        <div className="hero-image">
          <img src="/images/hero.jpg" alt="Hero Banner" />
        </div>
      </div>
    </section>
  );
}
