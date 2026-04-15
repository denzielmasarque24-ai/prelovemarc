"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession, getCart, getSession } from "@/lib/storage";

const navLinks = [
  { href: "/home", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/cart", label: "Cart" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const syncState = () => {
      const cart = getCart();
      const session = getSession();

      setCartCount(cart.reduce((total, item) => total + item.quantity, 0));
      setUsername(session?.username ?? "");
    };

    syncState();
    window.addEventListener("cart-updated", syncState);
    window.addEventListener("session-updated", syncState);
    window.addEventListener("storage", syncState);

    return () => {
      window.removeEventListener("cart-updated", syncState);
      window.removeEventListener("session-updated", syncState);
      window.removeEventListener("storage", syncState);
    };
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    clearSession();
    router.push("/");
  };

  return (
    <header className="site-navbar">
      <div className="navbar-inner">
        <Link href="/home" className="brand-block">
          <span className="brand-title">Rosette Boutique</span>
          <span className="brand-subtitle">Cute, classy, and softly styled</span>
        </Link>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label="Toggle navigation menu"
        >
          Menu
        </button>

        <div className={`navbar-menu ${menuOpen ? "open" : ""}`}>
          <nav className="navbar-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`navbar-link ${
                  pathname === link.href ? "active" : ""
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="navbar-utilities">
            <span className="counter-badge">Cart {cartCount}</span>
            {username ? (
              <span className="welcome-badge">Hi, {username}</span>
            ) : null}
            <button type="button" className="nav-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
