'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { setSession } from '@/lib/storage';
import styles from './verify.module.css';

const RESEND_COOLDOWN = 60;

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<number | null>(null);

  useEffect(() => {
    inputRefs.current[0]?.focus();
    return () => { if (cooldownRef.current) window.clearInterval(cooldownRef.current); };
  }, []);

  function startResendCooldown() {
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
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((char, i) => { next[i] = char; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  async function handleVerify() {
    const otp = digits.join('');
    if (otp.length < 6) { setError('Please enter all 6 digits.'); return; }
    if (!email) { setError('Email not found. Please register again.'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    // Verify OTP using Supabase — type "email" matches signInWithOtp
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (verifyError) {
      setLoading(false);
      const m = verifyError.message.toLowerCase();
      if (m.includes('expired') || m.includes('invalid'))
        setError('Invalid or expired code. Please request a new one.');
      else
        setError(verifyError.message);
      return;
    }

    // OTP valid — sign out the OTP session, then sign in with password
    await supabase.auth.signOut();

    const storedEmail    = sessionStorage.getItem('pending_verify_email') ?? email;
    const storedPassword = sessionStorage.getItem('pending_verify_password') ?? '';
    sessionStorage.removeItem('pending_verify_email');
    sessionStorage.removeItem('pending_verify_password');

    if (!storedPassword) {
      setLoading(false);
      setSuccess('Email verified! Please log in to continue.');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: storedEmail,
      password: storedPassword,
    });

    if (signInError || !signInData.user) {
      setLoading(false);
      setSuccess('Email verified! Please log in to continue.');
      setTimeout(() => router.push('/login'), 1500);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', signInData.user.id)
      .single<{ role: string | null; full_name: string | null }>();

    const role = profile?.role ?? 'user';

    setSession({
      fullName: profile?.full_name?.trim() || signInData.user.email?.split('@')[0] || 'User',
      email: signInData.user.email || storedEmail,
      role,
    });

    setLoading(false);
    setSuccess('Email verified! Redirecting...');
    setTimeout(() => router.push(role === 'admin' ? '/admin' : '/'), 1200);
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;
    setError('');
    setSuccess('');

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (resendError) {
      setError(resendError.message || 'Could not resend code. Please try again.');
    } else {
      setSuccess('A new 6-digit code has been sent to your email.');
      startResendCooldown();
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Email Verification</p>
        <h1 className={styles.title}>Enter OTP Code</h1>
        <p className={styles.subtitle}>
          A 6-digit code was sent to your Gmail{' '}
          <strong>{email || 'address'}</strong>.
          Check your inbox (and spam folder).
        </p>

        <p className={styles.otpLabel}>6-digit code sent to your Gmail</p>

        <div className={styles.otpRow}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              className={`${styles.otpInput}${digit ? ` ${styles.otpInputFilled}` : ''}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
              disabled={loading}
            />
          ))}
        </div>

        {error   && <p className={styles.bannerError}>{error}</p>}
        {success && <p className={styles.bannerSuccess}>{success}</p>}

        <button type="button" className={styles.btn} onClick={handleVerify} disabled={loading}>
          {loading ? <><span className={styles.spinner} aria-hidden="true" /> Verifying…</> : 'Verify OTP Code'}
        </button>

        <p className={styles.resend}>
          Didn&apos;t receive a code?{' '}
          {resendCooldown > 0 ? (
            <span className={styles.resendCooldown}>Resend in {resendCooldown}s</span>
          ) : (
            <button type="button" className={styles.resendLink} onClick={handleResend} disabled={loading}>
              Resend code
            </button>
          )}
        </p>
      </div>
    </div>
  );
}
