'use client';

import { useEffect, useState } from 'react';
import { adminGetMessages, adminMarkMessageRead } from '@/lib/admin';
import type { ContactMessage } from '@/lib/types';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [error, setError] = useState('');

  const load = () =>
    adminGetMessages()
      .then(setMessages)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));

  useEffect(() => { void load(); }, []);

  const handleOpen = async (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.is_read) {
      await adminMarkMessageRead(msg.id).catch(() => null);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  return (
    <>
      <h1 className="admin-page-title">Contact Messages</h1>
      {error && <div className="admin-error">{error}</div>}

      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {messages.length ? messages.map((m) => (
                <tr key={m.id} style={{ fontWeight: m.is_read ? 400 : 700 }}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.subject ?? '(no subject)'}</td>
                  <td>{m.created_at ? new Date(m.created_at).toLocaleDateString('en-PH') : '—'}</td>
                  <td>
                    <span className={`status-badge ${m.is_read ? 'status-delivered' : 'status-pending'}`}>
                      {m.is_read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => handleOpen(m)}>
                      View
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="admin-empty">No messages yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>✕</button>
            <h2>Message from {selected.name}</h2>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <p><strong>Email:</strong> {selected.email}</p>
              {selected.subject && <p><strong>Subject:</strong> {selected.subject}</p>}
              <p><strong>Date:</strong> {selected.created_at ? new Date(selected.created_at).toLocaleString('en-PH') : '—'}</p>
            </div>
            <div style={{ background: '#fdf0f3', borderRadius: 12, padding: '1rem', fontSize: '0.92rem', lineHeight: 1.7 }}>
              {selected.message}
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
