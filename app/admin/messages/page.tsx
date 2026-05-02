'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminGetMessages, adminMarkMessageRead } from '@/lib/admin';
import type { ContactMessage } from '@/lib/types';

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const load = () =>
    adminGetMessages()
      .then(setMessages)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'));

  useEffect(() => { void load(); }, []);

  const handleOpen = async (msg: ContactMessage) => {
    setSelected(msg);
    setReplyText('');
    setReplyError('');
    setReplySuccess('');
    if (!msg.is_read) {
      await adminMarkMessageRead(msg.id).catch(() => null);
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const handleSendReply = async () => {
    if (!selected) return;

    const adminReply = replyText.trim();
    if (!adminReply) {
      setReplyError('Reply cannot be empty.');
      setReplySuccess('');
      return;
    }

    setIsSendingReply(true);
    setReplyError('');
    setReplySuccess('');

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw new Error(sessionError.message);
      if (!session?.access_token) throw new Error('No active admin session found.');

      const response = await fetch('/api/admin/contact-reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messageId: selected.id,
          reply: adminReply,
        }),
      });

      const result = (await response.json().catch(() => null)) as {
        error?: string;
        repliedAt?: string;
        repliedBy?: string;
      } | null;

      if (!response.ok) {
        throw new Error(result?.error || `Failed to send reply (${response.status}).`);
      }

      const repliedAt = result?.repliedAt ?? new Date().toISOString();
      const repliedBy = result?.repliedBy ?? null;
      const updatedMessage: ContactMessage = {
        ...selected,
        is_read: true,
        status: 'replied',
        admin_reply: adminReply,
        replied_at: repliedAt,
        replied_by: repliedBy,
      };

      setSelected(updatedMessage);
      setMessages((prev) =>
        prev.map((message) =>
          message.id === selected.id ? updatedMessage : message,
        ),
      );
      setReplyText('');
      setReplySuccess('Reply sent successfully.');
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send reply.';
      console.error('Failed to send contact message reply:', sendError);
      setReplyError(message);
    } finally {
      setIsSendingReply(false);
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
                    <span className={`status-badge ${m.status === 'replied' ? 'status-delivered' : m.is_read ? 'status-confirmed' : 'status-pending'}`}>
                      {m.status === 'replied' ? 'Replied' : m.is_read ? 'Read' : 'Unread'}
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
            {selected.admin_reply ? (
              <div style={{ background: '#fffafc', border: '1px solid #f3c6cf', borderRadius: 12, marginTop: '1rem', padding: '1rem', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <strong style={{ color: '#4a3b3f', display: 'block', marginBottom: '0.35rem' }}>Latest Reply</strong>
                <p>{selected.admin_reply}</p>
                {selected.replied_at ? (
                  <small style={{ color: '#7a6a6f', display: 'block', marginTop: '0.5rem' }}>
                    Sent {new Date(selected.replied_at).toLocaleString('en-PH')}
                  </small>
                ) : null}
              </div>
            ) : null}
            <div className="admin-field" style={{ marginTop: '1rem' }}>
              <label htmlFor="contact-reply">Reply</label>
              <textarea
                id="contact-reply"
                rows={5}
                placeholder="Type your reply..."
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                disabled={isSendingReply}
              />
            </div>
            {replyError ? <div className="admin-error" style={{ marginTop: '1rem', marginBottom: 0 }}>{replyError}</div> : null}
            {replySuccess ? (
              <div className="admin-settings-alert success" style={{ marginTop: '1rem', marginBottom: 0 }}>
                {replySuccess}
              </div>
            ) : null}
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => setSelected(null)}>Close</button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                onClick={handleSendReply}
                disabled={isSendingReply}
              >
                {isSendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
