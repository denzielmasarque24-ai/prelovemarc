import Link from "next/link";

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.4 20v-6.7h2.3l.4-2.6h-2.7V9.1c0-.8.2-1.3 1.3-1.3h1.5V5.5c-.3 0-1-.1-1.8-.1-1.8 0-3 1-3 3.1v2.2H9v2.6h2.2V20Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17.2" cy="6.8" r="1" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <h3>PRE.LOVE zemarc</h3>
            <p>Give clothes a second chance</p>
          </div>

          <div>
            <h3>Links</h3>
            <div className="footer-links">
              <Link href="/">Home</Link>
              <Link href="/#products">Shop</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
            </div>
          </div>

          <div>
            <h3>Contact</h3>
            <div className="footer-links">
              <span>Email: hello@prelovezemarc.com</span>
              <span>Phone: +63 917 555 1122</span>
              <div className="social-row">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="social-icon"
                  aria-label="Facebook"
                >
                  <FacebookIcon />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="social-icon"
                  aria-label="Instagram"
                >
                  <InstagramIcon />
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="footer-note">Copyright 2026 PRE.LOVE zemarc</p>
      </div>
    </footer>
  );
}
