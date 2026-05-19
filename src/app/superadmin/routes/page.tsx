'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RoutesPage() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      router.replace(`/superadmin/clusters${search}`);
    } else {
      router.replace('/superadmin/clusters');
    }
  }, [router]);
  return null;
}
