'use client';

import React, { useState, useEffect } from 'react';
import { CompanySidebar } from '@/components/layout/CompanySidebar';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapVisualizer = dynamic(() => import('@/components/MapVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="h-[700px] w-full flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse">
      <span className="text-slate-500 font-bold">Loading Map Visualizer...</span>
    </div>
  )
});

export default function CompanyClustersPage() {
  const { user, companyId, loading: authLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'COMPANY_ADMIN' || !companyId) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router, companyId]);

  if (authLoading || !companyId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <span className="text-slate-500 font-medium animate-pulse">Loading Map...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CompanySidebar />
      <main className="lg:ml-64 p-4 lg:p-8 pt-24 pb-[10vh]">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4 lg:gap-8">
            <div>
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Spatial Intelligence</h2>
              <p className="text-slate-500 text-sm font-medium">Auto-generated clusters, graph routes, and clinic assignments.</p>
            </div>
            
            <div className="flex items-center gap-3 md:border-l md:border-slate-200 md:pl-8">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Layers className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Map First System</span>
              </div>
            </div>
          </div>
        </header>

        <MapVisualizer companyId={companyId} />
      </main>
    </div>
  );
}
