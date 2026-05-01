'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminGetDashboardStats } from '@/lib/admin';

const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const formatPrice = (v: number) => pesoFormatter.format(v / 100);

type Stats = Awaited<ReturnType<typeof adminGetDashboardStats>>;

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetDashboardStats()
      .then(setStats)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load stats'));
  }, []);

  return (
    <>
      <h1 className="admin-page-title">Dashboard Overview</h1>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total Orders</p>
          <p className="admin-stat-value pink">{stats?.totalOrders ?? '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Revenue (Delivered)</p>
          <p className="admin-stat-value">{stats ? formatPrice(stats.totalRevenue) : '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Customers</p>
          <p className="admin-stat-value pink">{stats?.totalUsers ?? '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Products</p>
          <p className="admin-stat-value">{stats?.totalProducts ?? '—'}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Unread Messages</p>
          <p className="admin-stat-value pink">{stats?.unreadMessages ?? '—'}</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Recent Orders</h2>
          <Link href="/admin/orders" className="admin-btn admin-btn-outline admin-btn-sm">
            View All
          </Link>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders.length ? (
                stats.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {o.id.slice(0, 8)}…
                    </td>
                    <td>{formatPrice(o.total)}</td>
                    <td>
                      <span className={`status-badge status-${o.status}`}>{o.status}</span>
                    </td>
                    <td>{new Date(o.created_at).toLocaleDateString('en-PH')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="admin-empty">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-quick-links" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <Link href="/admin/products" className="admin-btn admin-btn-primary">+ Add Product</Link>
        <Link href="/admin/orders" className="admin-btn admin-btn-outline">Manage Orders</Link>
        <Link href="/admin/messages" className="admin-btn admin-btn-outline">View Messages</Link>
      </div>
    </>
  );
}
