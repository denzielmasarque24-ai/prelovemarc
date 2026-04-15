import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="auth-shell landing-shell">
      <section className="landing-card glass-card">
        <span className="eyebrow">Pastel Fashion Boutique</span>
        <h1>Rosette Boutique</h1>
        <p>
          Soft silhouettes, dreamy pastel picks, and charming everyday outfits
          made for sweet and confident styling.
        </p>
        <div className="landing-actions">
          <Link href="/login" className="button-primary">
            Login
          </Link>
          <Link href="/signup" className="button-secondary">
            Sign Up
          </Link>
        </div>
      </section>
    </main>
  );
}
