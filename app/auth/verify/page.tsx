'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import styles from './verify.module.css';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    pasted.split('').forEach((char, i) => { next[i] = char; });
    setDigits(next);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleVerify() {
    const otp = digits.join('');
    if (otp.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    if (!email) {
      setError('Email not found. Please register again.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'signup',
    });

    setLoading(false);

    if (verifyError) {
      setError(verifyError.message || 'Invalid or expired code. Please try again.');
      return;
    }

    setSuccess('Email verified! Redirecting to login...');
    setTimeout(() => router.push('/login'), 1500);
  }

  async function handleResend() {
    if (!email) return;
    setError('');
    setSuccess('');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    if (resendError) {
      setError(resendError.message || 'Could not resend code.');
    } else {
      setSuccess('A new code has been sent to your email.');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Email Verification</p>
        <h1 className={styles.title}>Check your inbox</h1>
        <p className={styles.subtitle}>
          We sent a 6-digit code to{' '}
          <strong>{email || 'your email'}</strong>. Enter it below to verify your account.
        </p>

        <div className={styles.otpRow}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              className={styles.otpInput}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {error   && <p className={styles.bannerError}>{error}</p>}
        {success && <p className={styles.bannerSuccess}>{success}</p>}

        <button
          type="button"
          className={styles.btn}
          onClick={handleVerify}
          disabled={loading}
        >
          {loading ? 'Verifying…' : 'Verify Email'}
        </button>

        <p className={styles.resend}>
          Didn&apos;t receive a code?{' '}
          <button type="button" className={styles.resendLink} onClick={handleResend}>
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}
