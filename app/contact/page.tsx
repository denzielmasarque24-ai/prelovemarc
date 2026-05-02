'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ContactMessage } from '@/lib/types';
import './contact.css';

const contactItems = [
  { icon: 'Email', label: 'Email', value: 'prelove.shop@gmail.com' },
  { icon: 'Phone', label: 'Phone', value: '09xx xxx xxxx' },
  { icon: 'Place', label: 'Location', value: 'Online Shop' },
  { icon: 'IG', label: 'Instagram', value: '@prelove.shop' },
  { icon: 'FB', label: 'Facebook', value: 'prelove shop' },
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in name, email, and message.');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    const submittedEmail = form.email.trim().toLowerCase();
    const { error: dbError } = await supabase.from('contact_messages').insert({
      name: form.name.trim(),
      email: submittedEmail,
      subject: form.subject.trim() || null,
      message: form.message.trim(),
    });

    setSending(false);

    if (dbError) {
      setError('Failed to send message. Please try again.');
      return;
    }

    setSuccess('Message sent! We will get back to you soon.');
    setChatEmail(submittedEmail);
    await fetchMessages(submittedEmail);
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <main className="contact-main">
      <div className="contact-container">
        <h1 className="contact-title">CONTACT US</h1>

        <div className="contact-content">
          <div className="contact-left">
            <p className="contact-intro">Feel free to message us anytime.</p>
            <div className="contact-info">
              {contactItems.map((item) => (
                <div key={item.label} className="info-item">
                  <span className="info-icon" aria-hidden="true">{item.icon}</span>
                  <div className="info-text">
                    <p className="info-label">{item.label}</p>
                    <p className="info-value">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="contact-right">
            <form className="contact-form" onSubmit={handleSubmit}>
              <h2 className="contact-form-title">Send a Message</h2>

              {success && <div className="contact-success">{success}</div>}
              {error && <div className="contact-error">{error}</div>}

              <div className="contact-field">
                <label>Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="contact-field">
                <label>Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="contact-field">
                <label>Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="contact-field">
                <label>Message *</label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Write your message here..."
                  required
                />
              </div>

              <button type="submit" className="contact-submit-btn" disabled={sending}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>

            <section className="contact-chat" aria-labelledby="contact-chat-title">
              <div className="contact-chat-header">
                <div>
                  <p className="contact-chat-eyebrow">Messenger</p>
                  <h2 id="contact-chat-title">Your Conversation</h2>
                </div>
                {chatEmail ? <span>{chatEmail}</span> : null}
              </div>

              <div className="contact-chat-body">
                {!chatEmail ? (
                  <p className="contact-chat-empty">Enter your email to view your messages.</p>
                ) : loadingMessages ? (
                  <p className="contact-chat-empty">Loading conversation...</p>
                ) : messageError ? (
                  <p className="contact-chat-empty">{messageError}</p>
                ) : messages.length ? (
                  messages.map((message) => (
                    <div key={message.id} className="chat-thread">
                      <div className="chat-row chat-row-user">
                        <div className="chat-meta chat-meta-user">
                          <span>You</span>
                          <time>{formatMessageTime(message.created_at)}</time>
                        </div>
                        <div className="chat-bubble chat-bubble-user">
                          {message.subject ? <strong>{message.subject}</strong> : null}
                          <p>{message.message}</p>
                        </div>
                      </div>

                      {message.admin_reply ? (
                        <div className="chat-row chat-row-admin">
                          <div className="chat-meta">
                            <span>Admin</span>
                            <time>{formatMessageTime(message.replied_at)}</time>
                          </div>
                          <div className="chat-bubble chat-bubble-admin">
                            <p>{message.admin_reply}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="chat-waiting">Admin has not replied yet.</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="contact-chat-empty">No messages yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
