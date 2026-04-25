'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ProfileDropdown from '@/components/ProfileDropdown';
import { useCart } from '@/context/CartContext';
import { ensureBrowserSession, signOutUser } from '@/lib/auth';
import { getSession } from '@/lib/storage';
import type { SessionUser } from '@/lib/types';
import './Navbar.css';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/shop', label: 'Shop' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const authLinks = [
  { href: '/login', label: 'Log In', className: 'auth-link auth-link-outline' },
  { href: '/register', label: 'Register', className: 'auth-link auth-link-filled' },
];

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.75 5.25h1.56c.49 0 .92.34 1.03.82l.3 1.43m0 0 1.18 5.56c.1.46.5.79.97.79h7.66c.47 0 .88-.32.98-.77l1.21-5.27a1 1 0 0 0-.98-1.23H6.64Z" />
      <path d="M10 18.5a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Zm8 0a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z" />
    </svg>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { getTotalItems } = useCart();
  const cartCount = getTotalItems();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSessionUser(getSession());
    };

    syncSession();
    void ensureBrowserSession().then(syncSession);

    window.addEventListener('session-updated', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener('session-updated', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setSessionUser(null);
      router.push('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleProfileSaved = () => {
    setSessionUser(getSession());
  };

  return (
    <nav className="navbar" aria-label="Primary">
      <div className="navbar-container">
        <Link href="/" className="navbar-logo" aria-label="PRELOVE SHOP home">
          PRELOVE SHOP
        </Link>

        <ul className="nav-menu">
          {navLinks.map((link) => {
            const isActive =
              link.href === '/' ? pathname === link.href : pathname.startsWith(link.href);

            return (
              <li key={link.href} className="nav-item">
                <Link
                  href={link.href}
                  className={`nav-link${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="navbar-actions">
          {sessionUser ? (
            <ProfileDropdown
              user={sessionUser}
              onLogout={handleSignOut}
              onProfileSaved={handleProfileSaved}
            />
          ) : (
            authLinks.map((link) => {
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${link.className}${isActive ? ' active' : ''}`}
                >
                  {link.label}
                </Link>
              );
            })
          )}

          <Link href="/cart" className="cart-icon" aria-label="Open cart">
            <CartIcon />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </nav>
  );
}
