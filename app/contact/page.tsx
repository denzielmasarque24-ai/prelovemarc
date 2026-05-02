'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ContactMessage } from '@/lib/types';
import './contact.css';

const contactItems = [
  { label: 'Email', value: 'prelove.shop@gmail.com' },
  { label: 'Phone', value: '09xx xxx xxxx' },
  { label: 'Instagram', value: '@prelove.shop' },
  { label: 'Facebook', value: 'prelove shop' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [chatEmail, setChatEmail] = useState('');
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const formEmail = useMemo(() => form.email.trim().toLowerCase(), [form.email]);

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
      .order('created_at', { ascending: true });

    if (fetchError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('contact_messages')
        .select('id, name, email, subject, message, created_at')
        .eq('email', email)
        .order('created_at', { ascending: true });

      if (fallbackError) {
        setMessageError('Unable to load your chat right now.');
        setLoadingMessages(false);
        return;
      }

      setMessages((fallbackData ?? []) as ContactMessage[]);
      setMessageError('');
      setLoadingMessages(false);
      return;
    }

    setMessages((data ?? []) as ContactMessage[]);
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

  const formatMessageTime = (value?: string | null) => {
    if (!value) return '';

    return new Date(value).toLocaleString('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

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
    setMessages((current) => [...current, optimisticMessage]);

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
      <section className="messenger-shell" aria-label="PRELOVE SHOP contact chat">
        <aside className="messenger-profile">
          <div className="shop-avatar-wrap">
            <img src="/images/logo.png" alt="PRELOVE SHOP logo" className="shop-avatar" />
            <span className="online-dot" aria-hidden="true" />
          </div>
          <h1>PRELOVE SHOP</h1>
          <p className="shop-status">Online</p>
          <p className="shop-copy">Send us a message and track the reply in this chat.</p>

          <div className="profile-contact-list">
            {contactItems.map((item) => (
              <div key={item.label} className="profile-contact-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </aside>

        <section className="messenger-panel">
          <header className="messenger-header">
            <div className="mini-avatar">
              <img src="/images/logo.png" alt="" />
            </div>
            <div>
              <h2>PRELOVE SHOP</h2>
              <p>Online now</p>
            </div>
          </header>

          <form className="messenger-form" onSubmit={handleSubmit}>
            <div className="chat-identity">
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

            {(success || error) && (
              <div className={error ? 'chat-alert error' : 'chat-alert success'}>
                {error || success}
              </div>
            )}

            <div className="messenger-body" aria-live="polite">
              {!chatEmail ? (
                <p className="chat-empty">Enter your email to load your conversation.</p>
              ) : loadingMessages ? (
                <p className="chat-empty">Loading conversation...</p>
              ) : messageError ? (
                <p className="chat-empty">{messageError}</p>
              ) : messages.length ? (
                messages.map((message) => (
                  <div key={message.id} className="chat-thread">
                    <div className="message-row message-row-user">
                      <div className="message-bubble user-bubble">
                        <span className="sender-label">You</span>
                        {message.subject ? <strong>{message.subject}</strong> : null}
                        <p>{message.message}</p>
                      </div>
                      <time>{formatMessageTime(message.created_at)}</time>
                    </div>

                    {message.admin_reply ? (
                      <div className="message-row message-row-admin">
                        <div className="message-bubble admin-bubble">
                          <span className="sender-label">Admin</span>
                          <p>{message.admin_reply}</p>
                        </div>
                        <time>{formatMessageTime(message.replied_at)}</time>
                      </div>
                    ) : (
                      <p className="waiting-reply">Waiting for admin reply...</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="chat-empty">No messages yet. Start the conversation below.</p>
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
