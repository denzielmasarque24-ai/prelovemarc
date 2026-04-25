'use client';

import RegisterForm from '@/components/RegisterForm';
import styles from '../auth.module.css';

export default function RegisterPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Join the boutique</p>
        <h1 className={styles.title}>Create your PRELOVE SHOP account</h1>
        <p className={styles.text}>
          Register with Supabase to save your profile and start shopping with a protected account.
        </p>
        <RegisterForm variant="page" />
      </section>
    </main>
  );
}
