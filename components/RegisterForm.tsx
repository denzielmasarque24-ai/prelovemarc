"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMIN_EMAIL = "admin@gmail.com";
const SIGNUP_COOLDOWN_MS = 5000;

function mapRegistrationError(message?: string): string {
  if (!message) return "Sign up failed. Please try again.";

  const m = message.toLowerCase();

  if (m.includes("user already registered") || (m.includes("duplicate") && m.includes("email"))) {
    return "This email is already registered. Please log in instead.";
  }

  if (m.includes("rate limit") || m.includes("too many requests")) {
    return "Too many attempts. Please wait before trying again.";
  }

  if (m.includes("password") && m.includes("weak")) {
    return "Password is too weak. Use at least 6 characters.";
  }

  return message;
}

function showSignupError(message: string, setError: (message: string) => void) {
  const mappedMessage = mapRegistrationError(message);
  setError(mappedMessage);
  window.alert(mappedMessage);
}

function logSupabaseAuthError(error: unknown, email: string) {
  console.error("[RegisterForm] Supabase signUp error:", {
    email,
    error,
    message: error instanceof Error ? error.message : undefined,
    name: error instanceof Error ? error.name : undefined,
    status: typeof error === "object" && error !== null && "status" in error ? error.status : undefined,
    code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
  });
}

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
};

export default function RegisterForm({ onClose, onSwitchToLogin }: RegisterFormProps) {
  const router = useRouter();
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
    return () => {
      if (cooldownTimerRef.current) {
        window.clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    cooldownUntilRef.current = Date.now() + SIGNUP_COOLDOWN_MS;
    setCooldownSeconds(Math.ceil(SIGNUP_COOLDOWN_MS / 1000));

    if (cooldownTimerRef.current) {
      window.clearInterval(cooldownTimerRef.current);
    }

    cooldownTimerRef.current = window.setInterval(() => {
      const remainingMs = cooldownUntilRef.current - Date.now();

      if (remainingMs <= 0) {
        setCooldownSeconds(0);
        cooldownUntilRef.current = 0;

        if (cooldownTimerRef.current) {
          window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }

        return;
      }

      setCooldownSeconds(Math.ceil(remainingMs / 1000));
    }, 250);
  };

  const validate = (normalizedEmail: string) => {
    if (!fullName.trim()) return "Full name is required.";
    if (!emailRegex.test(normalizedEmail)) return "Please enter a valid email address.";
    if (password.trim().length < 6) return "Password must be at least 6 characters.";
    if (password.trim() !== confirmPassword.trim()) return "Passwords do not match.";
    return null;
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (isSubmittingRef.current || isSubmitting) {
      return;
    }

    if (Date.now() < cooldownUntilRef.current) {
      setError("Please wait before trying again.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const role = normalizedEmail === ADMIN_EMAIL ? "admin" : "user";

    const validationError = validate(normalizedEmail);
    if (validationError) {
      console.warn("[RegisterForm] frontend validation failed:", {
        email: normalizedEmail,
        reason: validationError,
      });
      setError(validationError);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
      });

      if (signUpError) {
        logSupabaseAuthError(signUpError, normalizedEmail);
        showSignupError(signUpError.message, setError);
        return;
      }

      if (!data.user) {
        showSignupError("Sign up returned no user. Please try again.", setError);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
        });

      if (profileError) {
        showSignupError(profileError.message, setError);
        return;
      }

      onClose?.();
      router.push(`/auth/verify?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[RegisterForm] unexpected error:", msg);
      showSignupError(msg || "Something went wrong. Please try again.", setError);
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
          <input
            id="reg-fullname"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            required
          />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-email">Email</label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-phone">Phone Number</label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXXX"
            autoComplete="tel"
          />
        </div>

        <div className="auth-form-field">
          <label htmlFor="reg-password">Password</label>
          <div className="auth-password-wrap">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
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
            <input
              id="reg-confirm"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowConfirm((p) => !p)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showConfirm} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={isSubmitDisabled}>
        {isSubmitting ? (
          <>
            <span className="auth-spinner" aria-hidden="true" /> Creating account...
          </>
        ) : cooldownSeconds > 0 ? (
          `Try again in ${cooldownSeconds}s`
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
