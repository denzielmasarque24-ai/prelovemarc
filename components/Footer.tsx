import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <h3>Rosette Boutique</h3>
            <p>
              Curated pastel fashion for soft, polished, and confidence-filled
              everyday looks.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <div className="footer-links">
              <Link href="/home">Shop</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>
          <div>
            <h3>Follow Us</h3>
            <div className="footer-links">
              <a href="https://instagram.com" target="_blank" rel="noreferrer">
                Instagram
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer">
                Facebook
              </a>
              <span>hello@rosetteboutique.com</span>
            </div>
          </div>
        </div>
        <p className="brand-subtitle">
          © 2026 Rosette Boutique. Designed with soft pastels and feminine
          charm.
        </p>
      </div>
    </footer>
  );
}
