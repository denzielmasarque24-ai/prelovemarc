import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="page-shell">
      <Navbar />

      <main className="page-content">
        <section className="story-grid">
          <article className="story-card">
            <span className="eyebrow">About Our Boutique</span>
            <h1>Rosette Boutique celebrates gentle style and graceful details.</h1>
            <p>
              Our boutique was imagined as a soft corner for fashion lovers who
              adore pastel tones, feminine cuts, and polished everyday outfits.
              Every collection is inspired by blush petals, morning light, and
              romantic confidence.
            </p>
            <p>
              We believe clothing should feel beautiful, wearable, and easy to
              style. That is why our picks focus on delicate silhouettes,
              flattering shapes, and elegant textures you can mix effortlessly.
            </p>
          </article>

          <article className="story-card">
            <span className="eyebrow">Why We Shine</span>
            <ul>
              <li>Thoughtfully curated pastel clothing for a charming boutique feel.</li>
              <li>Responsive and beginner-friendly shopping experience.</li>
              <li>Soft colors, gentle layouts, and clean product presentation.</li>
              <li>Designed for shoppers who love sweet and classy fashion.</li>
            </ul>
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
