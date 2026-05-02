'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import './contact.css';

const contactItems = [
  { icon: '✉️', label: 'Email', value: 'prelove.shop@gmail.com' },
  { icon: '📞', label: 'Phone', value: '09xx xxx xxxx' },
  { icon: '📍', label: 'Location', value: 'Online Shop' },
  { icon: '📸', label: 'Instagram', value: '@prelove.shop' },
  { icon: '👍', label: 'Facebook', value: 'prelove shop' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError('Please fill in name, email, and message.');
      return;
    }
    setSending(true);
    setError('');
    setSuccess('');

    const { error: dbError } = await supabase.from('contact_messages').insert({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      subject: form.subject.trim() || null,
      message: form.message.trim(),
    });

    setSending(false);

    if (dbError) {
      setError('Failed to send message. Please try again.');
      return;
    }

    setSuccess('Message sent! We will get back to you soon. 🌸');
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
                placeholder="Write your message here…"
                required
              />
            </div>

            <button type="submit" className="contact-submit-btn" disabled={sending}>
              {sending ? 'Sending…' : 'Send Message'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
