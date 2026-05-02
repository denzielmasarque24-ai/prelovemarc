"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COOLDOWN_MS = 60_000;

type RegisterFormProps = {
  onClose?: () => void;
  onSwitchToLogin?: () => void;
  onDuplicateEmail?: (email: string) => void;
  onOtpSent?: (email: string) => void;
};

export default function RegisterForm({ onSwitchToLogin, onOtpSent }: RegisterFormProps) {
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [error, setError]         = useState("");
  const [sending, setSending]     = useState(false);
  const [cooldown, setCooldown]   = useState(0);
  const cooldownRef = useRef<number | null>(null);

  useEffect(() => () => { if (cooldownRef.current) window.clearInterval(cooldownRef.current); }, []);

  function startCooldown() {
    const until = Date.now() + COOLDOWN_MS;
    setCooldown(60);
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    cooldownRef.current = window.setInterval(() => {
      const left = Math.ceil((until - Date.now()) / 1000);
      if (left <= 0) {
        setCooldown(0);
        window.clearInterval(cooldownRef.current!);
        cooldownRef.current = null;
      } else {
        setCooldown(left);
      }
    }, 500);
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!emailRegex.test(normalizedEmail)) { setError("Please enter a valid email address."); return; }

    setSending(true);

    // Store profile data — saved after OTP is verified
    sessionStorage.setItem("pending_full_name", fullName.trim());
    sessionStorage.setItem("pending_phone", phone.trim());
    sessionStorage.setItem("pending_email", normalizedEmail);

    // Send OTP via Gmail — bypasses Supabase email limits
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail }),
    });

    setSending(false);

    const resData = await res.json() as { error?: string };
    if (!res.ok) {
      console.error('[RegisterForm] send-otp error:', resData.error);
      setError(resData.error ?? 'Failed to send verification code.');
      return;
    }

    startCooldown();
    onOtpSent?.(normalizedEmail);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-grid">
        <div className="auth-form-field">
          <label htmlFor="reg-fullname">Full Name</label>
          <input id="reg-fullname" type="text" value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name" autoComplete="name" required />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" required />
        </div>

        <div className="auth-form-field auth-form-grid-full">
          <label htmlFor="reg-phone">Phone Number <span style={{ fontWeight: 400, color: "#b09098" }}>(optional)</span></label>
          <input id="reg-phone" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXXX" autoComplete="tel" />
        </div>
      </div>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={sending || cooldown > 0}>
        {sending ? (
          <><span className="auth-spinner" aria-hidden="true" /> Sending code…</>
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : (
          "Create Account"
        )}
      </button>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="auth-switch-link" onClick={onSwitchToLogin}>Log In</button>
      </p>
    </form>
  );
}
