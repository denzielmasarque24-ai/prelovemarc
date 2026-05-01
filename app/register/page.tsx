'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { queueAuthModal } from '@/lib/authModal';

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    queueAuthModal('register');
    router.replace('/');
  }, [router]);

  return null;
}
