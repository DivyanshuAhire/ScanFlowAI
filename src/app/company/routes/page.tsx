'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyRoutesPage() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      router.replace(`/company/clusters${search}`);
    } else {
      router.replace('/company/clusters');
    }
  }, [router]);
  return null;
}
