import type { Metadata } from 'next';
import './about.css';

export const metadata: Metadata = {
  title: 'PRELOVE SHOP - About Us',
  description: 'Learn about PRELOVE SHOP and our mission.',
};

export default function AboutPage() {
  return (
    <main className="about-main">
      <p className="sr-only">About Page Working</p>

      <div className="about-container">
        <h1 className="about-title">ABOUT US</h1>

        <div className="about-content">
          <p className="about-text">
            PRELOVE SHOP gives pre-loved clothes a second chance. We offer
            affordable, stylish pieces while promoting sustainable and
            eco-friendly fashion. Every item is carefully selected and prepared
            to be loved again.
          </p>
        </div>

        <div className="about-values">
          <div className="value-card">
            <h3>Sustainable</h3>
            <p>Promoting eco-friendly fashion through thoughtfully sourced pieces.</p>
          </div>
          <div className="value-card">
            <h3>Quality</h3>
            <p>Every item is selected for style, comfort, and dependable condition.</p>
          </div>
          <div className="value-card">
            <h3>Affordable</h3>
            <p>Stylish fashion at prices that stay practical for everyday shoppers.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
