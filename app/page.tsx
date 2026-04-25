import Image from "next/image";
import Link from "next/link";
import ProductCarousel from "@/components/ProductCarousel";
import styles from "./page.module.css";

const featuredPieces = [
  {
    title: "Romantic Layers",
    description: "Soft blouses, flowing skirts, and easy pairings for everyday elegance.",
    image: "/images/twist-front-tube-top.png",
  },
  {
    title: "Pastel Evenings",
    description: "Delicate silhouettes selected for polished dinners, dates, and special plans.",
    image: "/images/blue-top.png",
  },
  {
    title: "Closet Staples",
    description: "Well-loved essentials that look refined, timeless, and ready for repeat wear.",
    image: "/images/short1.png",
  },
];

export default function HomePage() {
  return (
    <main className={styles.pageShell}>
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>Soft styles, thoughtful choices</p>
              <h1 className={styles.heroTitle}>give clothes a second chance.</h1>
              <p className={styles.heroText}>
                PRELOVE SHOP curates beautifully kept fashion pieces for women who
                love romantic details, graceful silhouettes, and a boutique shopping
                experience with a softer footprint.
              </p>

              <div className={styles.heroActions}>
                <Link href="/shop" className={styles.primaryButton}>
                  Shop Now
                </Link>
                <Link href="/about" className={styles.secondaryButton}>
                  Our Story
                </Link>
              </div>
            </div>

            <div className={styles.heroCarousel}>
              <ProductCarousel />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.editorialSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Boutique edit</p>
            <h2>Designed to feel airy, polished, and personal.</h2>
            <p className={styles.sectionText}>
              Explore a curated wardrobe of pre-loved pieces chosen for their softness,
              versatility, and timeless charm.
            </p>
          </div>

          <div className={styles.featureGrid}>
            {featuredPieces.map((piece) => (
              <article key={piece.title} className={styles.featureCard}>
                <div className={styles.featureImageWrap}>
                  <Image
                    src={piece.image}
                    alt={piece.title}
                    width={420}
                    height={520}
                    className={styles.featureImage}
                  />
                </div>
                <div className={styles.featureBody}>
                  <h3>{piece.title}</h3>
                  <p>{piece.description}</p>
                  <Link href="/shop" className={styles.inlineLink}>
                    View Collection
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.storySection}>
        <div className={styles.container}>
          <div className={styles.storyCard}>
            <div>
              <p className={styles.eyebrow}>A softer way to shop</p>
              <h2>Beautiful clothes can live more than one story.</h2>
            </div>

            <p className={styles.storyText}>
              We believe fashion feels best when it is styled with care and chosen with
              intention. PRELOVE SHOP brings together elegant pre-loved pieces that help
              you build a wardrobe that looks premium, feels light, and wastes less.
            </p>

            <Link href="/contact" className={styles.primaryButton}>
              Visit the Boutique
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
