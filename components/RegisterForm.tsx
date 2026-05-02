"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_EMAIL = "admin@gmail.com";
const SIGNUP_COOLDOWN_MS = 5000;

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const isSubmittingRef = useRef(false);
  const cooldownUntilRef = useRef(0);
  const cooldownTimerRef = useRef<number | null>(null);

  const passwordStrength =
    password.length >= 10 ? "strong" : password.length >= 6 ? "good" : password.length > 0 ? "weak" : "";

  useEffect(() => {
    return () => { if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current); };
  }, []);

  function startCooldown() {
    cooldownUntilRef.current = Date.now() + SIGNUP_COOLDOWN_MS;
    setCooldownSeconds(Math.ceil(SIGNUP_COOLDOWN_MS / 1000));
    if (cooldownTimerRef.current) window.clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = window.setInterval(() => {
      const remaining = cooldownUntilRef.current - Date.now();
      if (remaining <= 0) {
        setCooldownSeconds(0);
        cooldownUntilRef.current = 0;
        if (cooldownTimerRef.current) { window.clearInterval(cooldownTimerRef.current); cooldownTimerRef.current = null; }
        return;
      }
      setCooldownSeconds(Math.ceil(remaining / 1000));
    }, 250);
  }

  function validate(normalizedEmail: string) {
    if (!fullName.trim()) return "Full name is required.";
    if (!emailRegex.test(normalizedEmail)) return "Please enter a valid email address.";
    if (password.trim().length < 6) return "Password must be at least 6 characters.";
    if (password.trim() !== confirmPassword.trim()) return "Passwords do not match.";
    return null;
  }

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isSubmittingRef.current || isSubmitting) return;
    if (Date.now() < cooldownUntilRef.current) { setError("Please wait before trying again."); return; }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const role = normalizedEmail === ADMIN_EMAIL ? "admin" : "user";

    const validationError = validate(normalizedEmail);
    if (validationError) { setError(validationError); return; }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Single step: send OTP — Supabase creates the user if needed
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true },
      });

      if (otpError) {
        console.error("[RegisterForm] signInWithOtp error:", otpError);
        const m = otpError.message.toLowerCase();
        if (m.includes("already registered") || m.includes("duplicate")) {
          onDuplicateEmail?.(normalizedEmail);
          return;
        }
        setError(otpError.message);
        return;
      }

      // Store profile data — saved to DB after OTP is verified
      sessionStorage.setItem("pending_full_name", fullName.trim());
      sessionStorage.setItem("pending_phone", phone.trim());
      sessionStorage.setItem("pending_password", normalizedPassword);
      sessionStorage.setItem("pending_role", role);

      onOtpSent?.(normalizedEmail);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[RegisterForm] unexpected error:", msg);
      if (msg.toLowerCase().includes("failed to fetch")) {
        setError("Cannot reach the server. Check your internet connection.");
        return;
      }
      setError(msg || "Something went wrong. Please try again.");
    } finally {
      startCooldown();
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || cooldownSeconds > 0;

  return (
    <form className="auth-form" onSubmit={handleSignUp} noValidate>
      <div className="auth-form-grid">
        <div className="auth-form-field">
          <label htmlFor="reg-fullname">Full Name</label>
          <input id="reg-fullname" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name" autoComplete="name" required />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-email">Email</label>
          <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email" required />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-phone">Phone Number</label>
          <input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXXX" autoComplete="tel" />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-password">Password</label>
          <div className="auth-password-wrap">
            <input id="reg-password" type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters"
              autoComplete="new-password" required />
            <button type="button" className="auth-eye-btn" onClick={() => setShowPassword((p) => !p)}
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
              onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password"
              autoComplete="new-password" required />
            <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm((p) => !p)}
              aria-label={showConfirm ? "Hide password" : "Show password"}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={isSubmitDisabled}>
        {isSubmitting ? (
          <><span className="auth-spinner" aria-hidden="true" /> Sending code...</>
        ) : cooldownSeconds > 0 ? (
          `Try again in ${cooldownSeconds}s`
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
