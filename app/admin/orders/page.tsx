'use client';

import { useEffect, useState } from 'react';
import { adminGetAllOrders, adminUpdateOrderStatus } from '@/lib/admin';
import type { Order, OrderStatus } from '@/lib/types';

const statuses: OrderStatus[] = [
  'pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled',
];

const pesoFormatter = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const formatPrice = (v: number) => pesoFormatter.format(v / 100);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<Order | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    adminGetAllOrders()
      .then(setOrders)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));

  useEffect(() => { void load(); }, []);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    try {
      await adminUpdateOrderStatus(orderId, status);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));
      if (selected?.id === orderId) setSelected((prev) => prev ? { ...prev, status } : prev);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  const filtered = orders.filter((o) => {
    const matchSearch = o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <>
      <h1 className="admin-page-title">Orders</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="Search by name or order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="admin-search"
          style={{ width: 'auto' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((o) => (
                <tr key={o.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{o.id.slice(0, 8)}…</td>
                  <td>{o.customer_name}</td>
                  <td>{formatPrice(o.total)}</td>
                  <td style={{ textTransform: 'capitalize' }}>{o.payment_method.replace(/_/g, ' ')}</td>
                  <td style={{ textTransform: 'capitalize' }}>{o.delivery_option}</td>
                  <td>
                    <span className={`status-badge status-${o.status}`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleDateString('en-PH') : '—'}</td>
                  <td style={{ display: 'flex', gap: '0.4rem' }}>
                    <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setSelected(o)}>
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="admin-empty">No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: 640 }}>
            <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>✕</button>
            <h2>Order Details</h2>

            <div style={{ display: 'grid', gap: '0.6rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <p><strong>Order ID:</strong> <span style={{ fontFamily: 'monospace' }}>{selected.id}</span></p>
              <p><strong>Customer:</strong> {selected.customer_name}</p>
              <p><strong>Phone:</strong> {selected.phone}</p>
              <p><strong>Address:</strong> {[selected.address, selected.barangay, selected.city, selected.province, selected.zip_code].filter(Boolean).join(', ')}</p>
              <p><strong>Payment:</strong> {selected.payment_method.replace(/_/g, ' ')}</p>
              {selected.reference_number && <p><strong>Reference #:</strong> {selected.reference_number}</p>}
              {selected.payment_proof && (
                <p><strong>Payment Proof:</strong>{' '}
                  <a href={selected.payment_proof} target="_blank" rel="noreferrer" style={{ color: '#d98fae' }}>View</a>
                </p>
              )}
              <p><strong>Delivery:</strong> {selected.delivery_option}</p>
              {selected.notes && <p><strong>Notes:</strong> {selected.notes}</p>}
              <p><strong>Total:</strong> {formatPrice(selected.total)}</p>
            </div>

            {selected.order_items?.length ? (
              <div style={{ marginBottom: '1rem' }}>
                <strong style={{ fontSize: '0.85rem', color: '#7a6a6f' }}>ITEMS</strong>
                <table className="admin-table" style={{ marginTop: '0.5rem' }}>
                  <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr></thead>
                  <tbody>
                    {selected.order_items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatPrice(item.price)}</td>
                        <td>{formatPrice(item.price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="admin-field">
              <label>Update Status</label>
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value as OrderStatus)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
