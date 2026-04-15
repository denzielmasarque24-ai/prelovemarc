"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";
import { emailExists, saveUser, usernameExists } from "@/lib/storage";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    username: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const {
      fullName,
      email,
      username,
      phoneNumber,
      password,
      confirmPassword,
    } = formData;

    if (
      !fullName.trim() ||
      !email.trim() ||
      !username.trim() ||
      !phoneNumber.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setError("Please complete all fields before signing up.");
      return;
    }

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    if (usernameExists(username)) {
      setError("That username is already registered.");
      return;
    }

    if (emailExists(email)) {
      setError("That email is already in use.");
      return;
    }

    saveUser({
      fullName: fullName.trim(),
      email: email.trim(),
      username: username.trim(),
      phoneNumber: phoneNumber.trim(),
      password,
    });

    setSuccess("Account created successfully. Redirecting to login...");

    window.setTimeout(() => {
      router.push("/login");
    }, 1200);
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Create Account</span>
        <h1>Join Rosette Boutique</h1>
        <p>
          Save your details, explore dreamy collections, and shop your favorite
          looks.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your full name"
              />
            </div>

            <div className="form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a username"
              />
            </div>

            <div className="form-field">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                placeholder="09XXXXXXXXX"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
              />
            </div>

            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
              />
            </div>
          </div>

          {error ? <div className="message-banner error">{error}</div> : null}
          {success ? (
            <div className="message-banner success">{success}</div>
          ) : null}

          <button type="submit" className="button-primary">
            Sign Up
          </button>
        </form>

        <div className="auth-links">
          <span>Already have an account?</span>
          <Link href="/login" className="button-ghost">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
