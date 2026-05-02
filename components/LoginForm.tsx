"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { setSession } from "@/lib/storage";
import { useRouter } from "next/navigation";

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

type LoginFormProps = {
  onClose?: () => void;
  onSwitchToRegister?: () => void;
  prefillEmail?: string;
};

export default function LoginForm({ onClose, onSwitchToRegister, prefillEmail }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (signInError || !data.user || !data.session) {
        setError(signInError?.message || "Login failed.");
        return;
      }

      const user = data.user;
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single<{ role: "admin" | "user" | null }>();

      if (profileError || !profile) {
        setError("User profile not found");
        return;
      }

      const role = profile.role ?? "user";

      setSession({
        fullName: user.email?.split("@")[0] || "User",
        email: user.email || trimmedEmail,
        role,
      });

      onClose?.();
      router.push(role === "admin" ? "/admin" : "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSignIn} noValidate>
      {prefillEmail && (
        <div className="auth-banner auth-banner-info">
          This email is already registered. Please log in instead.
        </div>
      )}
      <div className="auth-form-field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-form-field">
        <label htmlFor="login-password">Password</label>
        <div className="auth-password-wrap">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
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
      </div>

      {error && <div className="auth-banner auth-banner-error">{error}</div>}

      <button type="submit" className="auth-submit-btn" disabled={isSubmitting}>
        {isSubmitting ? "Logging in…" : "Log In"}
      </button>

      <p className="auth-switch">
        Don&apos;t have an account?{" "}
        <button type="button" className="auth-switch-link" onClick={onSwitchToRegister}>
          Register
        </button>
      </p>
    </form>
  );
}
