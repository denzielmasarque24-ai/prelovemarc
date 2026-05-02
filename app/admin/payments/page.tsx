'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatPrice } from '@/lib/format';
import { getOrderStatusClass, getOrderStatusLabel, normalizeOrderStatus } from '@/lib/orderStatus';
import type { Payment } from '@/lib/types';

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Primary source: payments table
        const { data: paymentRows, error: paymentError } = await supabase
          .from('payments')
          .select('*')
          .order('created_at', { ascending: false });

        if (paymentError) throw new Error(paymentError.message);

        if (paymentRows && paymentRows.length > 0) {
          setPayments(paymentRows as Payment[]);
          return;
        }

        // Fallback: derive payment records from orders when payments table is empty
        const { data: orderRows, error: orderError } = await supabase
          .from('orders')
          .select('id, user_id, customer_name, payment_method, total, status, reference_number, payment_proof, created_at')
          .order('created_at', { ascending: false });

        if (orderError) throw new Error(orderError.message);

        const derived: Payment[] = ((orderRows ?? []) as {
          id: string;
          user_id: string | null;
          customer_name: string;
          payment_method: string;
          total: number;
          status: string;
          reference_number: string | null;
          payment_proof: string | null;
          created_at: string;
        }[]).map((o) => ({
          id: o.id,
          order_id: o.id,
          user_id: o.user_id,
          customer_name: o.customer_name,
          payment_method: o.payment_method,
          amount: o.total,
          payment_status: normalizeOrderStatus(o.status) === 'completed' ? 'completed' : 'pending',
          proof_of_payment: o.payment_proof,
          reference_number: o.reference_number,
          created_at: o.created_at,
        }));

        setPayments(derived);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load payments.');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, []);

  const summary = useMemo(() => {
    const completed = payments.filter((p) => normalizeOrderStatus(p.payment_status) === 'completed');
    const cod = payments.filter((p) => p.payment_method === 'cod');
    const pending = payments.filter((p) => normalizeOrderStatus(p.payment_status) === 'pending');

    return {
      total: payments.length,
      cod: cod.length,
      pending: pending.length,
      paid: completed.length,
      revenue: completed.reduce((sum, p) => sum + p.amount, 0),
    };
  }, [payments]);

  return (
    <>
      <h1 className="admin-page-title">Payments</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total Payments</p>
          <p className="admin-stat-value pink">{isLoading ? '…' : summary.total}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">COD</p>
          <p className="admin-stat-value">{isLoading ? '…' : summary.cod}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Pending</p>
          <p className="admin-stat-value pink">{isLoading ? '…' : summary.pending}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Completed</p>
          <p className="admin-stat-value">{isLoading ? '…' : summary.paid}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-label">Total Revenue</p>
          <p className="admin-stat-value pink">{isLoading ? '…' : formatPrice(summary.revenue)}</p>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Payment Records</h2>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {payments.length ? payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {p.order_id.slice(0, 8)}…
                  </td>
                  <td>{p.customer_name}</td>
                  <td style={{ textTransform: 'capitalize' }}>
                    {p.payment_method.replace(/_/g, ' ')}
                  </td>
                  <td>{formatPrice(p.amount)}</td>
                  <td>
                    <span className={`status-badge ${getOrderStatusClass(p.payment_status)}`}>
                      {getOrderStatusLabel(p.payment_status)}
                    </span>
                  </td>
                  <td>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('en-PH') : '—'}
                  </td>
                  <td>
                    {p.proof_of_payment ? (
                      <a
                        href={p.proof_of_payment}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#d98fae', fontWeight: 700 }}
                      >
                        View
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="admin-empty">
                    {isLoading ? 'Loading…' : 'No payment records yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
