"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { flushPendingProfile, syncSessionFromUser } from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

const emailNotConfirmedMessage = "Please confirm your email before logging in.";
const invalidCredentialsMessage =
  "Email not found or password is incorrect. Check that this email is registered and the password is correct.";

function isEmailNotConfirmedError(message?: string) {
  return message?.toLowerCase().includes("email not confirmed") ?? false;
}

function isInvalidCredentialsError(message?: string) {
  return message?.toLowerCase().includes("invalid login credentials") ?? false;
}

function getLoginErrorMessage(message?: string) {
  if (isEmailNotConfirmedError(message)) {
    return emailNotConfirmedMessage;
  }

  if (isInvalidCredentialsError(message)) {
    return invalidCredentialsMessage;
  }

  return message || "Login failed. Please try again.";
}

function logAuthDebug(email: string, password: string) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("Login attempt", {
    email,
    passwordLength: password.length,
    hasPassword: Boolean(password),
  });
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.8 12s3.5-6.2 9.2-6.2 9.2 6.2 9.2 6.2-3.5 6.2-9.2 6.2S2.8 12 2.8 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
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
  variant?: "modal" | "page";
};

export default function LoginForm({
  onClose,
  onSwitchToRegister,
  variant = "modal",
}: LoginFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const email = formData.email.trim().toLowerCase();
    const password = formData.password.trim();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      logAuthDebug(email, password);

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        setError(getLoginErrorMessage(signInError?.message));
        return;
      }

      if (!data.session) {
        setError(emailNotConfirmedMessage);
        return;
      }

      await flushPendingProfile(data.user.id);
      await syncSessionFromUser(data.user.id, data.user.email);

      if (variant === "page") {
        router.push("/shop");
        return;
      }

      onClose?.();
    } catch (authError) {
      console.error("Modal sign-in error:", authError);
      setError("We could not log you in right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form auth-modal-form" onSubmit={handleSignIn}>
      <div className="auth-form-header">
        <h2>{variant === "page" ? "Log in to your account" : "Log in or create an account"}</h2>
        <p>
          {variant === "page"
            ? "Access your profile, protected cart, and saved boutique details."
            : "Your homepage stays visible behind the popup while you log in."}
        </p>
      </div>

      <div className="form-field">
        <label htmlFor="modal-signin-email">Email</label>
        <input
          id="modal-signin-email"
          type="email"
          value={formData.email}
          onChange={(event) =>
            setFormData((previous) => ({ ...previous, email: event.target.value }))
          }
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="modal-signin-password">Password</label>
        <div className="password-field">
          <input
            id="modal-signin-password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(event) =>
              setFormData((previous) => ({ ...previous, password: event.target.value }))
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword((previous) => !previous)}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      {error ? <div className="message-banner error">{error}</div> : null}

      <button type="submit" className="button-primary auth-submit-button" disabled={isSubmitting}>
        {isSubmitting ? "Logging In..." : "Log In"}
      </button>

      <div className="auth-switch-line">
        <span>New here?</span>
        <button
          type="button"
          className="auth-inline-link"
          onClick={() => {
            if (variant === "page") {
              router.push("/register");
              return;
            }

            onSwitchToRegister?.();
          }}
        >
          Register
        </button>
      </div>
    </form>
  );
}
