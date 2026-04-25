'use client';

import LoginForm from '@/components/LoginForm';
import styles from '../auth.module.css';

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Welcome back</p>
        <h1 className={styles.title}>Log in to PRELOVE SHOP</h1>
        <p className={styles.text}>
          Sign in with your Supabase account to continue browsing your boutique favorites.
        </p>
        <LoginForm variant="page" />
      </section>
    </main>
  );
}
