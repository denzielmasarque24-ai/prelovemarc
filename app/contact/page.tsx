'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { ContactMessage } from '@/lib/types';
import './contact.css';

type ChatUser = {
  name: string;
  email: string;
};

function getTimeValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function formatChatTime(value?: string | null) {
  if (!value) return '';

  return new Date(value).toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function fallbackName(email?: string | null) {
  return email?.split('@')[0]?.trim() || 'Customer';
}

export default function ContactPage() {
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => getTimeValue(a.created_at) - getTimeValue(b.created_at)),
    [messages],
  );

  const latestMessage = useMemo(
    () => [...messages].sort((a, b) => getTimeValue(b.created_at) - getTimeValue(a.created_at))[0],
    [messages],
  );

  const fetchMessages = async (email: string, showLoading = false) => {
    if (showLoading) setLoadingMessages(true);

    const { data, error: fetchError } = await supabase
      .from('contact_messages')
      .select('id, name, email, subject, message, admin_reply, is_read, created_at, replied_at')
      .eq('email', email)
      .order('created_at', { ascending: true });

    if (fetchError) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('contact_messages')
        .select('id, name, email, subject, message, admin_reply, created_at, replied_at')
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
    let isMounted = true;

    const loadUser = async () => {
      setLoadingUser(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (!session?.user?.email) {
        setChatUser(null);
        setLoadingUser(false);
        return;
      }

      const email = session.user.email.trim().toLowerCase();
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .maybeSingle<{ full_name: string | null }>();

      const user = {
        email,
        name: profile?.full_name?.trim() || fallbackName(email),
      };

      setChatUser(user);
      setLoadingUser(false);
      void fetchMessages(user.email, true);
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!chatUser?.email) return;

    const interval = window.setInterval(() => {
      void fetchMessages(chatUser.email);
    }, 10000);

    return () => window.clearInterval(interval);
  }, [chatUser?.email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!chatUser?.email) {
      setError('Please log in to send a message.');
      setSuccess('');
      return;
    }

    const trimmedMessage = messageText.trim();
    if (!trimmedMessage) {
      setError('Please type a message.');
      setSuccess('');
      return;
    }

    setSending(true);
    setError('');
    setSuccess('');

    const now = new Date().toISOString();
    const optimisticMessage: ContactMessage = {
      id: crypto.randomUUID(),
      name: chatUser.name,
      email: chatUser.email,
      subject: null,
      message: trimmedMessage,
      created_at: now,
    };

    setMessages((current) => [...current, optimisticMessage]);

    const { error: dbError } = await supabase.from('contact_messages').insert({
      name: chatUser.name,
      email: chatUser.email,
      subject: null,
      message: trimmedMessage,
    });

    setSending(false);

    if (dbError) {
      setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setError('Failed to send message. Please try again.');
      return;
    }

    setSuccess('Message sent.');
    setMessageText('');
    await fetchMessages(chatUser.email);
  };

  return (
    <main className="contact-main">
      <section className="chat-widget" aria-label="PRELOVE SHOP customer chat">
        <header className="chat-widget-header">
          <div className="chat-widget-avatar-wrap">
            <img src="/images/logo.png" alt="PRELOVE SHOP logo" className="chat-widget-avatar" />
            <span className="chat-widget-online" aria-hidden="true" />
          </div>
          <div>
            <h1>PRELOVE SHOP</h1>
            <p>We typically reply within a few hours</p>
          </div>
        </header>

        <form className="chat-widget-form" onSubmit={handleSubmit}>
          <div className="chat-widget-body" aria-live="polite">
            {loadingUser ? (
              <p className="chat-widget-empty">Loading your account...</p>
            ) : !chatUser ? (
              <p className="chat-widget-empty">Please log in to send us a message.</p>
            ) : loadingMessages ? (
              <p className="chat-widget-empty">Loading conversation...</p>
            ) : messageError ? (
              <p className="chat-widget-empty">{messageError}</p>
            ) : sortedMessages.length ? (
              <>
                <div className="chat-widget-date">{formatChatTime(latestMessage?.created_at)}</div>
                {sortedMessages.map((message) => (
                  <div key={message.id} className="chat-widget-thread">
                    <div className="chat-widget-row user">
                      <div className="chat-widget-bubble user">
                        <span>You</span>
                        <p>{message.message}</p>
                      </div>
                      <time>{formatChatTime(message.created_at)}</time>
                    </div>

                    {message.admin_reply?.trim() ? (
                      <div className="chat-widget-row admin">
                        <div className="chat-widget-bubble admin">
                          <span>PRELOVE SHOP</span>
                          <p>{message.admin_reply}</p>
                        </div>
                        <time>{formatChatTime(message.replied_at)}</time>
                      </div>
                    ) : (
                      <p className="chat-widget-waiting">Waiting for admin reply...</p>
                    )}
                  </div>
                ))}
              </>
            ) : (
              <div className="chat-widget-welcome">
                <span>Hi, {chatUser.name}!</span>
                <p>Send us a message and we will reply here.</p>
              </div>
            )}
          </div>

          <div className="chat-widget-composer">
            {(success || error) && (
              <div className={error ? 'chat-widget-alert error' : 'chat-widget-alert success'}>
                {error || success}
              </div>
            )}
            <div className="chat-widget-input-row">
              <textarea
                rows={1}
                placeholder="Type a message..."
                value={messageText}
                onChange={(event) => {
                  setMessageText(event.target.value);
                  setError('');
                  setSuccess('');
                }}
                disabled={sending || !chatUser}
              />
              <button type="submit" disabled={sending || !chatUser} aria-label="Send message">
                {sending ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}
