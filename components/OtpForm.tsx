"use client";

import { useEffect, useRef, useState } from "react";

const RESEND_COOLDOWN = 60;

type OtpFormProps = {
  pendingEmail: string;
  onVerified: (email: string) => void;
  onBack: () => void;
};

export default function OtpForm({ pendingEmail, onVerified, onBack }: OtpFormProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<number | null>(null);

  // Start resend cooldown on mount (OTP was just sent)
  useEffect(() => {
    inputRefs.current[0]?.focus();
    startCooldown();
    return () => { if (cooldownRef.current) window.clearInterval(cooldownRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownRef.current) window.clearInterval(cooldownRef.current);
    cooldownRef.current = window.setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) { window.clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((char, i) => { next[i] = char; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerify() {
    const otpCode = digits.join("");
    if (otpCode.length < 6) { setError("Please enter all 6 digits."); return; }

    setLoading(true);
    setError("");
    setSuccess("");

    // Verify against our otp_codes table via API route
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, code: otpCode }),
    });

    const resData = await res.json() as { error?: string };

    if (!res.ok) {
      setLoading(false);
      setError(resData.error ?? 'Invalid or expired verification code. Please request a new one.');
      return;
    }

    // Code is valid — notify parent to switch to login tab
    setLoading(false);
    onVerified(pendingEmail);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError("");
    setSuccess("");

    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail }),
    });

    const resData = await res.json() as { error?: string };
    if (!res.ok) {
      setError(resData.error ?? 'Could not resend code. Please try again.');
    } else {
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setSuccess("A new verification code has been sent to your Gmail.");
      startCooldown();
    }
  }

  return (
    <div className="otp-form">
      <p className="otp-hint">
        Enter the 6-digit verification code sent to your Gmail{" "}
        <strong>{pendingEmail}</strong>
      </p>

      <div className="otp-inputs" role="group" aria-label="Verification code">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            className={`otp-box${digit ? " otp-box-filled" : ""}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`Digit ${i + 1}`}
            disabled={loading}
            autoComplete="one-time-code"
          />
        ))}
      </div>

      {error   && <div className="auth-banner auth-banner-error">{error}</div>}
      {success && <div className="auth-banner auth-banner-success">{success}</div>}

      <button
        type="button"
        className="auth-submit-btn"
        onClick={handleVerify}
        disabled={loading}
      >
        {loading
          ? <><span className="auth-spinner" aria-hidden="true" /> Verifying…</>
          : "Verify Code"}
      </button>

      <div className="otp-footer">
        <span>Didn&apos;t receive a code?</span>
        {resendCooldown > 0 ? (
          <span className="otp-cooldown">Resend in {resendCooldown}s</span>
        ) : (
          <button type="button" className="auth-switch-link" onClick={handleResend} disabled={loading}>
            Resend Code
          </button>
        )}
      </div>

      <button type="button" className="otp-back" onClick={onBack}>
        ← Back to Register
      </button>
    </div>
  );
}
