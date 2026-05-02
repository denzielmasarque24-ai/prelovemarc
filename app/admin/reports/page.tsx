'use client';

import { useEffect, useState } from 'react';
import { adminGetAllOrders } from '@/lib/admin';
import { getOrderStatusClass, getOrderStatusLabel, normalizeOrderStatus } from '@/lib/orderStatus';
import { formatPrice } from '@/lib/format';
import type { Order } from '@/lib/types';

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    adminGetAllOrders()
      .then(setOrders)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const completed = orders.filter((o) => normalizeOrderStatus(o.status) === 'completed');
  const totalRevenue = completed.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => normalizeOrderStatus(o.status) === 'pending').length;
  const cancelled = orders.filter((o) => normalizeOrderStatus(o.status) === 'cancelled').length;

  const byPayment = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.payment_method] = (acc[o.payment_method] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <h1 className="admin-page-title">Sales & Reports</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total Orders</p>
          <p className="admin-stat-value pink">{orders.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Completed</p>
          <p className="admin-stat-value">{completed.length}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Pending</p>
          <p className="admin-stat-value pink">{pending}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Cancelled</p>
          <p className="admin-stat-value">{cancelled}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total Revenue</p>
          <p className="admin-stat-value">{formatPrice(totalRevenue)}</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2>Orders by Payment Method</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Payment Method</th><th>Orders</th></tr></thead>
            <tbody>
              {Object.entries(byPayment).map(([method, count]) => (
                <tr key={method}>
                  <td style={{ textTransform: 'capitalize' }}>{method.replace(/_/g, ' ')}</td>
                  <td>{count}</td>
                </tr>
              ))}
              {!Object.keys(byPayment).length && (
                <tr><td colSpan={2} className="admin-empty">No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><h2>All Orders</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.length ? orders.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.id.slice(0, 8)}…</td>
                  <td>{o.customer_name}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td>
                    <span className={`status-badge ${getOrderStatusClass(o.status)}`}>
                      {getOrderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH') : '—'}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="admin-empty">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
