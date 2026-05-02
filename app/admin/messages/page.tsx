'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { adminGetMessages, adminMarkMessageRead } from '@/lib/admin';
import type { ContactMessage } from '@/lib/types';

type Conversation = {
  email: string;
  name: string;
  messages: ContactMessage[];
  latest: ContactMessage;
  latestTime: string | null;
  hasUnread: boolean;
};

function getTimeValue(value?: string | null) {
  return value ? new Date(value).getTime() : 0;
}

function getMessageActivityTime(message: ContactMessage) {
  return Math.max(getTimeValue(message.replied_at), getTimeValue(message.created_at));
}

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

function buildConversations(messages: ContactMessage[]) {
  const grouped = new Map<string, ContactMessage[]>();

  for (const message of messages) {
    const email = message.email?.trim().toLowerCase();
    if (!email) continue;

    grouped.set(email, [...(grouped.get(email) ?? []), message]);
  }

  return [...grouped.entries()]
    .map(([email, rows]) => {
      const sortedMessages = [...rows].sort(
        (a, b) => getTimeValue(a.created_at) - getTimeValue(b.created_at),
      );
      const latest = [...sortedMessages].sort(
        (a, b) => getMessageActivityTime(b) - getMessageActivityTime(a),
      )[0];

      return {
        email,
        name: latest.name || sortedMessages[0]?.name || 'Customer',
        messages: sortedMessages,
        latest,
        latestTime: latest.replied_at || latest.created_at || null,
        hasUnread: sortedMessages.some((message) => !message.is_read),
      } satisfies Conversation;
    })
    .sort((a, b) => getTimeValue(b.latestTime) - getTimeValue(a.latestTime));
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [replySuccess, setReplySuccess] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  const conversations = useMemo(() => buildConversations(messages), [messages]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((conversation) => {
      const haystack = [
        conversation.name,
        conversation.email,
        ...conversation.messages.flatMap((message) => [
          message.subject,
          message.message,
          message.admin_reply,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [conversations, search]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.email === selectedEmail) ??
      filteredConversations[0] ??
      null,
    [conversations, filteredConversations, selectedEmail],
  );

  const replyTarget = useMemo(() => {
    if (!selectedConversation) return null;

    const unreplied = [...selectedConversation.messages]
      .reverse()
      .find((message) => !message.admin_reply);

    return unreplied ?? selectedConversation.messages[selectedConversation.messages.length - 1] ?? null;
  }, [selectedConversation]);

  const loadMessages = async () => {
    try {
      const data = await adminGetMessages();
      setMessages(data);
      setError('');
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

  useEffect(() => {
    if (!selectedEmail && conversations[0]) {
      setSelectedEmail(conversations[0].email);
    }
  }, [conversations, selectedEmail]);

  const handleSelect = async (conversation: Conversation) => {
    setSelectedEmail(conversation.email);
    setReplyText('');
    setReplyError('');
    setReplySuccess('');

    const unreadMessages = conversation.messages.filter((message) => !message.is_read);
    if (!unreadMessages.length) return;

    await Promise.all(unreadMessages.map((message) => adminMarkMessageRead(message.id).catch(() => null)));
    setMessages((prev) =>
      prev.map((message) =>
        message.email?.trim().toLowerCase() === conversation.email
          ? { ...message, is_read: true }
          : message,
      ),
    );
  };

  const handleSendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replyTarget) return;

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
          messageId: replyTarget.id,
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
        ...replyTarget,
        is_read: true,
        status: 'replied',
        admin_reply: adminReply,
        replied_at: repliedAt,
        replied_by: repliedBy,
      };

      setMessages((prev) =>
        prev.map((message) => (message.id === replyTarget.id ? updatedMessage : message)),
      );
      setReplyText('');
      setReplySuccess('Reply sent.');
      await loadMessages();
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
          <span>{conversations.length}</span>
        </div>

        <input
          className="admin-chat-search"
          placeholder="Search messages"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {error ? <div className="admin-chat-error">{error}</div> : null}

        <div className="admin-chat-list">
          {filteredConversations.length ? (
            filteredConversations.map((conversation) => {
              const isActive = selectedConversation?.email === conversation.email;
              const preview = getLatestPreview(conversation.latest);
              const time = formatPreviewTime(conversation.latestTime);

              return (
                <button
                  key={conversation.email}
                  type="button"
                  className={`admin-chat-item${isActive ? ' active' : ''}`}
                  onClick={() => void handleSelect(conversation)}
                >
                  <span className="admin-chat-avatar">{getInitial(conversation.name)}</span>
                  <span className="admin-chat-summary">
                    <span className="admin-chat-name-row">
                      <strong>{conversation.name}</strong>
                      <time>{time}</time>
                    </span>
                    <span className="admin-chat-preview">{preview}</span>
                  </span>
                  {conversation.hasUnread ? <span className="admin-unread-dot" aria-label="Unread message" /> : null}
                </button>
              );
            })
          ) : (
            <p className="admin-chat-empty">No messages found.</p>
          )}
        </div>
      </aside>

      <section className="admin-chat-panel">
        {selectedConversation ? (
          <>
            <header className="admin-chat-header">
              <span className="admin-chat-avatar large">{getInitial(selectedConversation.name)}</span>
              <div>
                <h2>{selectedConversation.name}</h2>
                <p>{selectedConversation.email}</p>
              </div>
            </header>

            <div className="admin-chat-body">
              <div className="admin-chat-date">{formatChatTime(selectedConversation.latestTime)}</div>

              {selectedConversation.messages.map((message) => (
                <div key={message.id} className="admin-thread-group">
                  <div className="admin-message-row customer">
                    <div className="admin-message-bubble customer">
                      <span>{message.name}</span>
                      {message.subject ? <strong>{message.subject}</strong> : null}
                      <p>{message.message}</p>
                    </div>
                    <time>{formatChatTime(message.created_at)}</time>
                  </div>

                  {message.admin_reply ? (
                    <div className="admin-message-row shop">
                      <div className="admin-message-bubble shop">
                        <span>PRELOVE SHOP</span>
                        <p>{message.admin_reply}</p>
                      </div>
                      <time>{formatChatTime(message.replied_at)}</time>
                    </div>
                  ) : (
                    <p className="admin-waiting-reply">Waiting for admin reply...</p>
                  )}
                </div>
              ))}
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
                <button type="submit" disabled={isSendingReply || !replyTarget}>
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
