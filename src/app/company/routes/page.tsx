'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyRoutesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/company/clusters');
  }, [router]);
  return null;
}
