"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  rememberPendingProfile,
  syncSessionFromUser,
} from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailConfirmationMessage = "Account created. Please verify your email.";

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

type RegisterFormProps = {
  onClose?: () => void;
  onSwitchToLogin?: () => void;
  variant?: "modal" | "page";
};

export default function RegisterForm({
  onClose,
  onSwitchToLogin,
  variant = "modal",
}: RegisterFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const { fullName, email, username, phone, password, confirmPassword } = formData;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (
      !fullName.trim() ||
      !normalizedEmail ||
      !username.trim() ||
      !phone.trim() ||
      !normalizedPassword ||
      !normalizedConfirmPassword
    ) {
      setError("Please complete all fields before signing up.");
      return;
    }

    if (!emailPattern.test(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (normalizedPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            name: fullName.trim(),
            username: username.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (signUpError || !data.user) {
        setError(signUpError?.message || "Sign up failed. Please try again.");
        return;
      }

      const profileDetails = {
        fullName,
        email: normalizedEmail,
        username,
        phone,
      };

      rememberPendingProfile(data.user.id, profileDetails);

      if (data.session) {
        await syncSessionFromUser(data.user.id, data.user.email);

        if (variant === "page") {
          router.push("/shop");
          return;
        }

        onClose?.();
        return;
      }

      setSuccess(emailConfirmationMessage);
      setFormData({
        fullName: "",
        email: "",
        username: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });
    } catch (authError) {
      console.error("Modal sign-up error:", authError);
      setError("We could not finish creating your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="auth-form auth-modal-form" onSubmit={handleSignUp}>
      <div className="auth-form-header">
        <h2>{variant === "page" ? "Create your account" : "Open your account"}</h2>
        <p>
          {variant === "page"
            ? "Set up your boutique profile and start shopping right away."
            : "Fast setup, elegant details, and no full-page redirect."}
        </p>
      </div>

      <div className="form-grid register-grid">
        <div className="form-field">
          <label htmlFor="modal-signup-name">Full Name</label>
          <input
            id="modal-signup-name"
            type="text"
            value={formData.fullName}
            onChange={(event) =>
              setFormData((previous) => ({ ...previous, fullName: event.target.value }))
            }
            placeholder="Your full name"
            autoComplete="name"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-email">Email</label>
          <input
            id="modal-signup-email"
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
          <label htmlFor="modal-signup-username">Username</label>
          <input
            id="modal-signup-username"
            type="text"
            value={formData.username}
            onChange={(event) =>
              setFormData((previous) => ({ ...previous, username: event.target.value }))
            }
            placeholder="yourusername"
            autoComplete="username"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-phone">Phone Number</label>
          <input
            id="modal-signup-phone"
            type="tel"
            value={formData.phone}
            onChange={(event) =>
              setFormData((previous) => ({ ...previous, phone: event.target.value }))
            }
            placeholder="09XXXXXXXXX"
            autoComplete="tel"
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-password">Password</label>
          <div className="password-field">
            <input
              id="modal-signup-password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, password: event.target.value }))
              }
              placeholder="Create a password"
              autoComplete="new-password"
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
        <div className="form-field">
          <label htmlFor="modal-signup-confirm">Confirm Password</label>
          <div className="password-field">
            <input
              id="modal-signup-confirm"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(event) =>
                setFormData((previous) => ({
                  ...previous,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="Confirm your password"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowConfirmPassword((previous) => !previous)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              <EyeIcon open={showConfirmPassword} />
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="message-banner error">{error}</div> : null}
      {success ? <div className="message-banner success">{success}</div> : null}

      <button type="submit" className="button-primary auth-submit-button" disabled={isSubmitting}>
        {isSubmitting ? "Creating Account..." : "Register"}
      </button>

      <div className="auth-switch-line">
        <span>{success ? "Ready to continue?" : "Already have an account?"}</span>
        <button
          type="button"
          className="auth-inline-link"
          onClick={() => {
            if (variant === "page") {
              router.push("/login");
              return;
            }

            onSwitchToLogin?.();
          }}
        >
          Log In
        </button>
      </div>
    </form>
  );
}
