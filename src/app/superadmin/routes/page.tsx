'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RoutesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/superadmin/clusters');
  }, [router]);
  return null;
}
