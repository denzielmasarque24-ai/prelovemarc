import type { Metadata } from 'next';
import './about.css';

export const metadata: Metadata = {
  title: 'About Zemárc - PRELOVE SHOP',
  description: 'Learn about Zemárc, a Cebu-based PRELOVE SHOP for affordable and sustainable fashion.',
};

export default function AboutPage() {
  const sections = [
    {
      title: 'Sustainable Fashion',
      description:
        'Choose style that cares for the planet. Zemárc Preloved promotes sustainable fashion by giving clothes a second life, reducing waste while keeping you effortlessly stylish.',
    },
    {
      title: 'Affordable Finds',
      description:
        'Look good without overspending. At Zemárc Preloved, we offer trendy and versatile pieces at budget-friendly prices—perfect for everyday wear, summer fits, and special events.',
    },
    {
      title: 'Quality You Can Trust',
      description:
        'Each item is gently used, carefully handled, and thoughtfully selected to ensure you still get great quality and style in every purchase.',
    },
  ];

  return (
    <main className="about-main">
      <section className="about-container" aria-labelledby="about-title">
        <div className="about-heading">
          <span className="about-kicker">PRELOVE SHOP</span>
          <h1 id="about-title" className="about-title">
            About Zemárc
          </h1>
        </div>

        <div className="about-content">
          <p className="about-text">
            Welcome to Zemárc – Cebu Based, where preloved clothes and brand-new
            clothes style meets affordability. Each piece in our collection is
            carefully selected and gently used, making sure you get quality outfits
            that are still in great condition.
          </p>
          <p className="about-text">
            Our clothes are handled with care and offered at budget-friendly
            prices—perfect for summer looks, event outfits, casual wear, and more.
            Whether you’re dressing up or keeping it simple, we’ve got something
            for you.
          </p>
        </div>

        <div className="about-values">
          {sections.map((section) => (
            <article className="value-card" key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
