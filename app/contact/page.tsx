'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ContactMessage } from '@/lib/types';
import './contact.css';

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

function getPreview(message: ContactMessage) {
  return message.admin_reply?.trim() || message.message || 'No message preview';
}

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [chatEmail, setChatEmail] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const formEmail = useMemo(() => form.email.trim().toLowerCase(), [form.email]);

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter((message) =>
      [message.subject, message.message, message.admin_reply]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [messages, search]);

  const selected = useMemo(
    () => messages.find((message) => message.id === selectedId) ?? filteredMessages[0] ?? null,
    [filteredMessages, messages, selectedId],
  );

  const fetchMessages = async (email: string, showLoading = false) => {
    if (!email) {
      setMessages([]);
      setMessageError('');
      return;
    }

    if (showLoading) setLoadingMessages(true);

    const { data, error: fetchError } = await supabase
      .from('contact_messages')
      .select('id, name, email, subject, message, admin_reply, created_at, replied_at')
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (fetchError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('contact_messages')
        .select('id, name, email, subject, message, created_at')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        setMessageError('Unable to load your chats right now.');
        setLoadingMessages(false);
        return;
      }

      const fallbackMessages = (fallbackData ?? []) as ContactMessage[];
      setMessages(fallbackMessages);
      if (!selectedId && fallbackMessages[0]) setSelectedId(fallbackMessages[0].id);
      setMessageError('');
      setLoadingMessages(false);
      return;
    }

    const nextMessages = (data ?? []) as ContactMessage[];
    setMessages(nextMessages);
    if (!selectedId && nextMessages[0]) setSelectedId(nextMessages[0].id);
    setMessageError('');
    setLoadingMessages(false);
  };

  useEffect(() => {
    if (!formEmail) return;

    const timeout = window.setTimeout(() => {
      setChatEmail(formEmail);
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [formEmail]);

  useEffect(() => {
    if (!chatEmail) return;

    void fetchMessages(chatEmail, true);
    const interval = window.setInterval(() => {
      void fetchMessages(chatEmail);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [chatEmail]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError('Please enter your name, email, and message.');
      setSuccess('');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    const submittedEmail = form.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const optimisticMessage: ContactMessage = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      email: submittedEmail,
      subject: form.subject.trim() || null,
      message: form.message.trim(),
      created_at: now,
    };

    setChatEmail(submittedEmail);
    setSelectedId(optimisticMessage.id);
    setMessages((current) => [optimisticMessage, ...current]);

    const { error: dbError } = await supabase.from('contact_messages').insert({
      name: optimisticMessage.name,
      email: submittedEmail,
      subject: optimisticMessage.subject,
      message: optimisticMessage.message,
    });

    setSending(false);

    if (dbError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setError('Failed to send message. Please try again.');
      return;
    }

    setSuccess('Message sent.');
    setForm((current) => ({ ...current, message: '' }));
    await fetchMessages(submittedEmail);
  };

  return (
    <main className="contact-main">
      <section className="messenger-shell" aria-label="PRELOVE SHOP customer chats">
        <aside className="user-chat-sidebar">
          <div className="user-chat-head">
            <h1>Chats</h1>
            <span>{messages.length}</span>
          </div>

          <div className="user-chat-identity">
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Subject
              <input
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                placeholder="Optional"
              />
            </label>
          </div>

          <input
            className="user-chat-search"
            placeholder="Search messages"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="user-chat-list">
            {!chatEmail ? (
              <p className="chat-empty">Enter your email to load your chats.</p>
            ) : loadingMessages ? (
              <p className="chat-empty">Loading chats...</p>
            ) : messageError ? (
              <p className="chat-empty">{messageError}</p>
            ) : filteredMessages.length ? (
              filteredMessages.map((message) => {
                const active = selected?.id === message.id;

                return (
                  <button
                    key={message.id}
                    type="button"
                    className={`user-chat-item${active ? ' active' : ''}`}
                    onClick={() => setSelectedId(message.id)}
                  >
                    <span className="user-chat-avatar">P</span>
                    <span className="user-chat-summary">
                      <span className="user-chat-name-row">
                        <strong>PRELOVE SHOP</strong>
                        <time>{formatPreviewTime(message.replied_at || message.created_at)}</time>
                      </span>
                      <span className="user-chat-preview">{getPreview(message)}</span>
                    </span>
                    {!message.admin_reply ? <span className="user-unread-dot" aria-label="Waiting for admin reply" /> : null}
                  </button>
                );
              })
            ) : (
              <p className="chat-empty">No chats yet.</p>
            )}
          </div>
        </aside>

        <section className="messenger-panel">
          <header className="messenger-header">
            <div className="mini-avatar">
              <img src="/images/logo.png" alt="" />
            </div>
            <div>
              <h2>PRELOVE SHOP</h2>
              <p>{chatEmail || 'Online now'}</p>
            </div>
          </header>

          <form className="messenger-form user-messenger-form" onSubmit={handleSubmit}>
            {(success || error) && (
              <div className={error ? 'chat-alert error' : 'chat-alert success'}>
                {error || success}
              </div>
            )}

            <div className="messenger-body" aria-live="polite">
              {!selected ? (
                <p className="chat-empty">Select a chat or send a new message below.</p>
              ) : (
                <div className="chat-thread">
                  <div className="chat-date-badge">{formatChatTime(selected.created_at)}</div>

                  <div className="message-row message-row-user">
                    <div className="message-bubble user-bubble">
                      <span className="sender-label">You</span>
                      {selected.subject ? <strong>{selected.subject}</strong> : null}
                      <p>{selected.message}</p>
                    </div>
                    <time>{formatChatTime(selected.created_at)}</time>
                  </div>

                  {selected.admin_reply ? (
                    <div className="message-row message-row-admin">
                      <div className="message-bubble admin-bubble">
                        <span className="sender-label">Admin</span>
                        <p>{selected.admin_reply}</p>
                      </div>
                      <time>{formatChatTime(selected.replied_at)}</time>
                    </div>
                  ) : (
                    <p className="waiting-reply">Waiting for admin reply...</p>
                  )}
                </div>
              )}
            </div>

            <div className="messenger-composer">
              <textarea
                rows={1}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Type a message..."
                required
              />
              <button type="submit" disabled={sending} aria-label="Send message">
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
