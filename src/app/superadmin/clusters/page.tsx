'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Layers, Navigation } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapVisualizer = dynamic(() => import('@/components/MapVisualizer'), {
  ssr: false,
  loading: () => (
    <div className="h-[700px] w-full flex items-center justify-center bg-slate-100 rounded-2xl animate-pulse">
      <span className="text-slate-500 font-bold">Loading Map Visualizer...</span>
    </div>
  )
});

export default function ClustersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.push('/auth/login');
      return;
    }

    axios.get('/api/companies').then(res => {
      setCompanies(res.data);
      if (res.data.length > 0) {
        let initialCompanyId = res.data[0]._id;
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const queryCompanyId = params.get('companyId');
          if (queryCompanyId && res.data.some((c: any) => c._id === queryCompanyId)) {
            initialCompanyId = queryCompanyId;
          }
        }
        setSelectedCompanyId(initialCompanyId);
      }
    });
  }, [user, authLoading, router]);

  if (authLoading || (companies.length === 0 && !selectedCompanyId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <span className="text-slate-500 font-medium animate-pulse">Syncing Session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
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

          <div className="flex flex-wrap items-center gap-3">
            <select 
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </header>

        {selectedCompanyId && (
          <MapVisualizer companyId={selectedCompanyId} />
        )}
      </main>
    </div>
  );
}
