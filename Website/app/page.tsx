'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
    } else {
      switch (user.role) {
        case 'ADMIN':
          router.push('/admin/dashboard');
          break;
        case 'COMPANY_OPERATOR':
          router.push('/operator/dashboard');
          break;
        case 'CLINIC_OPERATOR':
          router.push('/clinic/book');
          break;
        case 'EMPLOYEE':
          router.push('/employee/route');
          break;
        default:
          router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 text-accent animate-spin" />
      <span className="text-sm font-semibold text-slate-500">Redirecting to Dashboard...</span>
    </div>
  );
}
