"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  rememberPendingProfile,
  syncSessionFromUser,
} from "@/lib/auth";
import { supabase } from "@/lib/supabaseClient";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailConfirmationMessage = "Account created successfully! Please check your email to confirm.";

type FieldErrors = Partial<Record<keyof RegisterFormState, string>>;

type RegisterFormState = {
  fullName: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

function mapRegistrationError(message?: string) {
  if (!message) {
    return "Sign up failed. Please try again.";
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered")) {
    return "This email is already registered. Please log in.";
  }

  if (normalized.includes("duplicate key") && normalized.includes("username")) {
    return "This username is already in use.";
  }

  if (normalized.includes("duplicate key") && normalized.includes("email")) {
    return "This email is already registered. Please log in.";
  }

  return message;
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormState>({
    fullName: "",
    email: "",
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const passwordStrength =
    formData.password.length >= 10
      ? "strong"
      : formData.password.length >= 6
        ? "good"
        : formData.password.length > 0
          ? "weak"
          : "";

  const validateForm = () => {
    const errors: FieldErrors = {};
    const normalizedEmail = formData.email.trim().toLowerCase();
    const normalizedPassword = formData.password.trim();
    const normalizedConfirmPassword = formData.confirmPassword.trim();

    if (!formData.fullName.trim()) {
      errors.fullName = "Full name is required.";
    }

    if (!normalizedEmail) {
      errors.email = "Email is required.";
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!normalizedPassword) {
      errors.password = "Password is required.";
    } else if (normalizedPassword.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    if (!normalizedConfirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (normalizedPassword !== normalizedConfirmPassword) {
      errors.confirmPassword = "Passwords must match.";
    }

    return errors;
  };

  const updateField = (field: keyof RegisterFormState, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
    setFieldErrors((previous) => {
      if (!previous[field]) {
        return previous;
      }

      const next = { ...previous };
      delete next[field];
      return next;
    });
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setFieldErrors({});

    const { fullName, email, username, phone, password } = formData;
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();

    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setError("Please fix the highlighted fields.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (signUpError || !data.user) {
        setError(mapRegistrationError(signUpError?.message));
        return;
      }

      const profileDetails = {
        fullName: fullName.trim(),
        email: normalizedEmail,
        username: username.trim(),
        phone: phone.trim(),
      };

      const { error: upsertError } = await supabase.from("users").upsert(
        {
          id: data.user.id,
          email: data.user.email ?? normalizedEmail,
          full_name: fullName.trim(),
          username: username.trim(),
          phone: phone.trim(),
          role: "user",
          address: "",
          avatar: "",
        },
        { onConflict: "id" },
      );

      if (upsertError) {
        rememberPendingProfile(data.user.id, profileDetails);
        if (data.session) {
          setError(mapRegistrationError(upsertError.message));
          return;
        }
      }

      if (data.session) {
        await syncSessionFromUser(data.user.id, data.user.email);
      }

      setSuccess(data.session ? "Account created successfully." : emailConfirmationMessage);
      setFormData({
        fullName: "",
        email: "",
        username: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      if (variant === "page") {
        router.push("/login");
        return;
      }

      if (data.session) {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        } else {
          onClose?.();
        }
      }
    } catch (authError) {
      console.error("Modal sign-up error:", authError);
      setError(
        authError instanceof Error
          ? mapRegistrationError(authError.message)
          : "We could not finish creating your account. Please try again.",
      );
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
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            className={fieldErrors.fullName ? "input-error" : undefined}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? "modal-signup-name-error" : undefined}
            required
          />
          {fieldErrors.fullName ? (
            <p className="field-error" id="modal-signup-name-error">
              {fieldErrors.fullName}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-email">Email</label>
          <input
            id="modal-signup-email"
            type="email"
            value={formData.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={fieldErrors.email ? "input-error" : undefined}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "modal-signup-email-error" : undefined}
            required
          />
          {fieldErrors.email ? (
            <p className="field-error" id="modal-signup-email-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-username">Username</label>
          <input
            id="modal-signup-username"
            type="text"
            value={formData.username}
            onChange={(event) => updateField("username", event.target.value)}
            placeholder="yourusername"
            autoComplete="username"
            className={fieldErrors.username ? "input-error" : undefined}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={fieldErrors.username ? "modal-signup-username-error" : undefined}
          />
          {fieldErrors.username ? (
            <p className="field-error" id="modal-signup-username-error">
              {fieldErrors.username}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-phone">Phone Number</label>
          <input
            id="modal-signup-phone"
            type="tel"
            value={formData.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="09XXXXXXXXX"
            autoComplete="tel"
            className={fieldErrors.phone ? "input-error" : undefined}
            aria-invalid={Boolean(fieldErrors.phone)}
            aria-describedby={fieldErrors.phone ? "modal-signup-phone-error" : undefined}
          />
          {fieldErrors.phone ? (
            <p className="field-error" id="modal-signup-phone-error">
              {fieldErrors.phone}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-password">Password</label>
          <div className="password-field">
            <input
              id="modal-signup-password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(event) => updateField("password", event.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
              className={fieldErrors.password ? "input-error" : undefined}
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={
                fieldErrors.password ? "modal-signup-password-error" : undefined
              }
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
          {formData.password ? (
            <div className={`password-strength ${passwordStrength}`}>
              <span />
              <p>
                Password strength:{" "}
                {passwordStrength === "strong"
                  ? "Strong"
                  : passwordStrength === "good"
                    ? "Good"
                    : "Weak"}
              </p>
            </div>
          ) : null}
          {fieldErrors.password ? (
            <p className="field-error" id="modal-signup-password-error">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        <div className="form-field">
          <label htmlFor="modal-signup-confirm">Confirm Password</label>
          <div className="password-field">
            <input
              id="modal-signup-confirm"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(event) => updateField("confirmPassword", event.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className={fieldErrors.confirmPassword ? "input-error" : undefined}
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={
                fieldErrors.confirmPassword ? "modal-signup-confirm-error" : undefined
              }
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
          {fieldErrors.confirmPassword ? (
            <p className="field-error" id="modal-signup-confirm-error">
              {fieldErrors.confirmPassword}
            </p>
          ) : null}
        </div>
      </div>

      {error ? <div className="message-banner error">{error}</div> : null}
      {success ? <div className="message-banner success">{success}</div> : null}

      <button type="submit" className="button-primary auth-submit-button" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="button-spinner" aria-hidden="true" />
            Creating account...
          </>
        ) : (
          "Register"
        )}
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
