"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { findUser, getSession, setSession } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSession()) {
      router.replace("/home");
    }
  }, [router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!username.trim() || !password.trim()) {
      setError("Please fill in your username and password.");
      return;
    }

    const user = findUser(username, password);

    if (!user) {
      setError("Invalid username or password. Please try again.");
      return;
    }

    setSession({
      fullName: user.fullName,
      username: user.username,
    });
    router.push("/home");
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="eyebrow">Welcome Back</span>
        <h1>Login to your boutique account</h1>
        <p>Step into your curated pastel wardrobe and continue shopping.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="button-primary">
            Login
          </button>
        </form>

        <div className="auth-links">
          <span>New here?</span>
          <Link href="/signup" className="button-ghost">
            Create an account
          </Link>
        </div>
      </section>
    </main>
  );
}
