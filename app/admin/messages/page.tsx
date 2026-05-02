'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminGetMessages, adminMarkMessageRead } from '@/lib/admin';
import type { ContactMessage } from '@/lib/types';

function formatChatTime(value?: string | null) {
  if (!value) return '';

  return new Date(value).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatPreviewTime(value?: string | null) {
  if (!value) return '';

  return new Date(value).toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitial(name?: string | null) {
  return (name?.trim()?.[0] || '?').toUpperCase();
}

function getLatestPreview(message: ContactMessage) {
  return message.admin_reply?.trim() || message.message || 'No message preview';
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter((message) => {
      const haystack = [
        message.name,
        message.email,
        message.subject,
        message.message,
        message.admin_reply,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [messages, search]);

  const selected = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? filteredMessages[0] ?? null,
    [filteredMessages, messages, selectedId],
  );

  const loadMessages = async () => {
    try {
      const data = await adminGetMessages();
      setMessages(data);
      setError('');

      if (!selectedId && data[0]) {
        setSelectedId(data[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load messages.');
    }
  };

  useEffect(() => {
    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 10000);

    return () => window.clearInterval(interval);
  }, []);

  const handleSelect = async (message: ContactMessage) => {
    setSelectedId(message.id);
    setReplyText('');
    setReplyError('');
    setReplySuccess('');

    if (!message.is_read) {
      await adminMarkMessageRead(message.id).catch(() => null);
      setMessages((prev) =>
        prev.map((item) => (item.id === message.id ? { ...item, is_read: true } : item)),
      );
    }
  };

  const handleSendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

      setMessages((prev) =>
        prev.map((message) => (message.id === selected.id ? updatedMessage : message)),
      );
      setReplyText('');
      setReplySuccess('Reply sent.');
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send reply.';
      console.error('Failed to send contact message reply:', sendError);
      setReplyError(message);
    } finally {
      setIsSendingReply(false);
    }
  };

  return (
    <section className="admin-messenger-shell" aria-label="Contact message chats">
      <aside className="admin-chat-sidebar">
        <div className="admin-chat-sidebar-head">
          <h1>Chats</h1>
          <span>{messages.length}</span>
        </div>

        <input
          className="admin-chat-search"
          placeholder="Search messages"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {error ? <div className="admin-chat-error">{error}</div> : null}

        <div className="admin-chat-list">
          {filteredMessages.length ? (
            filteredMessages.map((message) => {
              const isActive = selected?.id === message.id;
              const preview = getLatestPreview(message);
              const time = formatPreviewTime(message.replied_at || message.created_at);

              return (
                <button
                  key={message.id}
                  type="button"
                  className={`admin-chat-item${isActive ? ' active' : ''}`}
                  onClick={() => void handleSelect(message)}
                >
                  <span className="admin-chat-avatar">{getInitial(message.name)}</span>
                  <span className="admin-chat-summary">
                    <span className="admin-chat-name-row">
                      <strong>{message.name}</strong>
                      <time>{time}</time>
                    </span>
                    <span className="admin-chat-preview">{preview}</span>
                  </span>
                  {!message.is_read ? <span className="admin-unread-dot" aria-label="Unread message" /> : null}
                </button>
              );
            })
          ) : (
            <p className="admin-chat-empty">No messages found.</p>
          )}
        </div>
      </aside>

      <section className="admin-chat-panel">
        {selected ? (
          <>
            <header className="admin-chat-header">
              <span className="admin-chat-avatar large">{getInitial(selected.name)}</span>
              <div>
                <h2>{selected.name}</h2>
                <p>{selected.email}</p>
              </div>
            </header>

            <div className="admin-chat-body">
              <div className="admin-chat-date">{formatChatTime(selected.created_at)}</div>

              <div className="admin-message-row customer">
                <div className="admin-message-bubble customer">
                  <span>{selected.name}</span>
                  {selected.subject ? <strong>{selected.subject}</strong> : null}
                  <p>{selected.message}</p>
                </div>
                <time>{formatChatTime(selected.created_at)}</time>
              </div>

              {selected.admin_reply ? (
                <div className="admin-message-row shop">
                  <div className="admin-message-bubble shop">
                    <span>PRELOVE SHOP</span>
                    <p>{selected.admin_reply}</p>
                  </div>
                  <time>{formatChatTime(selected.replied_at)}</time>
                </div>
              ) : (
                <p className="admin-waiting-reply">Waiting for admin reply...</p>
              )}
            </div>

            <form className="admin-chat-composer" onSubmit={handleSendReply}>
              {replyError ? <div className="admin-chat-error composer-alert">{replyError}</div> : null}
              {replySuccess ? <div className="admin-chat-success composer-alert">{replySuccess}</div> : null}
              <div className="admin-chat-input-row">
                <textarea
                  rows={1}
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(event) => {
                    setReplyText(event.target.value);
                    setReplyError('');
                    setReplySuccess('');
                  }}
                  disabled={isSendingReply}
                />
                <button type="submit" disabled={isSendingReply}>
                  {isSendingReply ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="admin-chat-placeholder">
            <h2>Select a conversation</h2>
            <p>Choose a customer message from the Chats list.</p>
          </div>
        )}
      </section>
    </section>
  );
}
