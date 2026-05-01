'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import './admin.css';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Products', icon: '👗' },
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/users', label: 'Customers', icon: '👥' },
  { href: '/admin/messages', label: 'Messages', icon: '💬' },
  { href: '/admin/reports', label: 'Reports', icon: '📈' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if ((data as { role?: string } | null)?.role !== 'admin') {
        router.push('/');
        return;
      }
      setChecking(false);
    };
    void checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (checking) {
    return (
      <div className="admin-checking">
        <p>Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-icon">🌸</span>
          <div>
            <strong>PRELOVE SHOP</strong>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${isActive ? ' active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button type="button" className="admin-logout-btn" onClick={handleLogout}>
          🚪 Logout
        </button>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <p className="admin-topbar-title">
            {navItems.find((n) =>
              n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)
            )?.label ?? 'Admin'}
          </p>
          <Link href="/" className="admin-view-site">← View Site</Link>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
