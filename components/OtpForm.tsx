"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const RESEND_COOLDOWN = 60;

type OtpFormProps = {
  pendingEmail: string;
  onVerified: (email: string) => void;
  onBack: () => void;
};

export default function OtpForm({ pendingEmail, onVerified, onBack }: OtpFormProps) {
  const [digits, setDigits]         = useState(["", "", "", "", "", ""]);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [loading, setLoading]       = useState(false);
  const [resendCooldown, setResend] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef  = useRef<number | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    startCooldown();
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown() {
    setResend(RESEND_COOLDOWN);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setResend((s) => {
        if (s <= 1) { window.clearInterval(timerRef.current!); timerRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function handleChange(i: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[i] = digit; setDigits(next);
    if (digit && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerify() {
    const code = digits.join("");
    if (code.length < 6) { setError("Please enter all 6 digits."); return; }

    setLoading(true); setError(""); setSuccess("");

    // Step 1: Verify code against otp_codes table
    const verifyRes = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: pendingEmail, code }),
    });

    const verifyData = await verifyRes.json() as { error?: string };

    if (!verifyRes.ok) {
      setLoading(false);
      setError(verifyData.error ?? "Invalid or expired code. Please try again.");
      return;
    }

    // Step 2: Save profile using data stored during registration
    const fullName = sessionStorage.getItem("pending_full_name") ?? "";
    const phone    = sessionStorage.getItem("pending_phone") ?? "";
    const role     = sessionStorage.getItem("pending_role") ?? "user";
    const userId   = sessionStorage.getItem("pending_user_id") ?? "";

    if (userId) {
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: fullName, phone, role }, { onConflict: "id" });
      if (profileError) console.error("[OtpForm] profile error:", profileError);
    }

    // Step 3: Clean up
    ["pending_full_name", "pending_phone", "pending_email",
     "pending_password", "pending_role", "pending_user_id"].forEach((k) =>
      sessionStorage.removeItem(k)
    );
    await supabase.auth.signOut();

    setLoading(false);
    onVerified(pendingEmail);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(""); setSuccess("");

    try {
      const res = await fetch("/api/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const data = await res.json() as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not resend code. Please try again.");
      } else {
        setDigits(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setSuccess("A new verification code has been sent to your Gmail.");
        startCooldown();
      }
    } catch {
      setError("Cannot reach the server. Please try again.");
    }
  }

  return (
    <div className="otp-form">
      <p className="otp-hint">
        Enter the 6-digit code sent to your Gmail{" "}
        <strong>{pendingEmail}</strong>
      </p>

      <div className="otp-inputs" role="group" aria-label="Verification code">
        {digits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            className={`otp-box${digit ? " otp-box-filled" : ""}`}
            type="text" inputMode="numeric" maxLength={1}
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

      <button type="button" className="auth-submit-btn" onClick={handleVerify} disabled={loading}>
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

      <button type="button" className="otp-back" onClick={onBack}>← Back</button>
    </div>
  );
}
