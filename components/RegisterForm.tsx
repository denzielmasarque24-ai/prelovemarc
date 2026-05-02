"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_EMAIL = "admin@gmail.com";
const COOLDOWN_MS = 60_000;

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="eye-svg">
        <path d="M2.8 12s3.5-6.2 9.2-6.2 9.2 6.2 9.2 6.2-3.5 6.2-9.2 6.2S2.8 12 2.8 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="eye-svg">
      <path d="m3 4 18 16" />
      <path d="M10.7 6.1c.4-.1.8-.1 1.3-.1 5.7 0 9.2 6 9.2 6s-1.2 2.2-3.4 3.9" />
      <path d="M14.5 14.2a3 3 0 0 1-4-3.6" />
      <path d="M7 7.3C4.7 9 2.8 12 2.8 12s3.5 6.2 9.2 6.2c1.6 0 3-.4 4.2-1" />
    </svg>
  );
}

type RegisterFormProps = {
  onClose?: () => void;
  onSwitchToLogin?: () => void;
  onDuplicateEmail?: (email: string) => void;
  onOtpSent?: (email: string) => void;
};

export default function RegisterForm({ onSwitchToLogin, onDuplicateEmail, onOtpSent }: RegisterFormProps) {
  const [fullName, setFullName]           = useState("");
  const [email, setEmail]                 = useState("");
  const [phone, setPhone]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirm]     = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [error, setError]                 = useState("");
  const [sending, setSending]             = useState(false);
  const [cooldown, setCooldown]           = useState(0);
  const cooldownRef = useRef<number | null>(null);

  const passwordStrength =
    password.length >= 10 ? "strong" : password.length >= 6 ? "good" : password.length > 0 ? "weak" : "";

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

  function validate(normalizedEmail: string) {
    if (!fullName.trim())                          return "Full name is required.";
    if (!emailRegex.test(normalizedEmail))         return "Please enter a valid email address.";
    if (password.trim().length < 6)                return "Password must be at least 6 characters.";
    if (password.trim() !== confirmPassword.trim()) return "Passwords do not match.";
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail    = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const role               = normalizedEmail === ADMIN_EMAIL ? "admin" : "user";

    const validationError = validate(normalizedEmail);
    if (validationError) { setError(validationError); return; }

    setSending(true);

    try {
      // Step 1: Create Supabase auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signUpError) {
        const m = signUpError.message.toLowerCase();
        if (m.includes("already registered") || m.includes("duplicate")) {
          onDuplicateEmail?.(normalizedEmail);
          return;
        }
        setError(signUpError.message);
        return;
      }

      if (!data.user) { setError("Sign up failed. Please try again."); return; }

      // Step 2: Sign out immediately — no auto-login
      await supabase.auth.signOut();

      // Step 3: Save profile data for after OTP verification
      sessionStorage.setItem("pending_full_name", fullName.trim());
      sessionStorage.setItem("pending_phone",     phone.trim());
      sessionStorage.setItem("pending_email",     normalizedEmail);
      sessionStorage.setItem("pending_password",  normalizedPassword);
      sessionStorage.setItem("pending_role",      role);
      sessionStorage.setItem("pending_user_id",   data.user.id);

      // Step 4: Send OTP via Gmail
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const resData = await res.json() as { error?: string };
      if (!res.ok) {
        setError(resData.error ?? "Failed to send verification code. Please try again.");
        return;
      }

      startCooldown();
      onOtpSent?.(normalizedEmail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("failed to fetch")) {
        setError("Cannot reach the server. Check your internet connection.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setSending(false);
    }
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

        <div className="auth-form-field">
          <label htmlFor="reg-phone">Phone Number</label>
          <input id="reg-phone" type="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXXX" autoComplete="tel" />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-password">Password</label>
          <div className="auth-password-wrap">
            <input id="reg-password" type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters" autoComplete="new-password" required />
            <button type="button" className="auth-eye-btn"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}>
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {passwordStrength && (
            <div className={`auth-strength auth-strength-${passwordStrength}`}>
              <span className="auth-strength-bar" />
              <span className="auth-strength-label">
                {passwordStrength === "strong" ? "Strong" : passwordStrength === "good" ? "Good" : "Weak"}
              </span>
            </div>
          )}
        </div>

        <div className="auth-form-field auth-form-grid-full">
          <label htmlFor="reg-confirm">Confirm Password</label>
          <div className="auth-password-wrap">
            <input id="reg-confirm" type={showConfirm ? "text" : "password"} value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password" autoComplete="new-password" required />
            <button type="button" className="auth-eye-btn"
              onClick={() => setShowConfirm((p) => !p)}
              aria-label={showConfirm ? "Hide password" : "Show password"}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>
        </div>

      </div>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={sending || cooldown > 0}>
        {sending ? (
          <><span className="auth-spinner" aria-hidden="true" /> Creating account…</>
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : (
          "Create Account"
        )}
      </button>

      <p className="auth-switch">
        Already have an account?{" "}
        <button type="button" className="auth-switch-link" onClick={onSwitchToLogin}>
          Log In
        </button>
      </p>
    </form>
  );
}
