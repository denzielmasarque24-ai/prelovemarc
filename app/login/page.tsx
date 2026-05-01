'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { queueAuthModal } from '@/lib/authModal';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    queueAuthModal('login');
    router.replace('/');
  }, [router]);

  return null;
}
