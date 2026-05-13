'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Hospital, 
  Plus, 
  Search, 
  MapPin, 
  Building2,
  Loader2,
  MoreVertical
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { CreateClinicModal } from '@/components/modals/CreateClinicModal';

export default function SuperAdminClinics() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [clinics, setClinics] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clinicsRes, companiesRes] = await Promise.all([
        axios.get('/api/clinics/global'),
        axios.get('/api/companies')
      ]);
      setClinics(clinicsRes.data);
      setCompanies(companiesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'SUPER_ADMIN') {
      router.push('/auth/login');
      return;
    }
    fetchData();
  }, [user, authLoading]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Global Clinic Directory</h2>
            <p className="text-slate-500 font-medium">Monitoring all partner diagnostic sites.</p>
          </div>
          <div className="flex gap-4">
            <select 
              className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
            >
              <option value="">All Companies</option>
              {companies.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Clinic
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clinics
              .filter(c => !selectedCompanyId || c.companyId?._id === selectedCompanyId)
              .map(clinic => (
                <div key={clinic._id} className="card-premium group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                      <Hospital className="w-6 h-6" />
                    </div>
                    <button className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{clinic.name}</h3>
                  
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5" /> {clinic.companyId?.name || 'Unknown Company'}
                    </p>
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5" /> {clinic.location?.area || 'No Area'}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                      {clinic.clusterId?.name || 'Unassigned Cluster'}
                    </span>
                    <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      Operational
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        <CreateClinicModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          companyId={selectedCompanyId || companies[0]?._id} // Default to first company if none selected
          onSuccess={fetchData}
        />
      </main>
    </div>
  );
}
