'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Search, 
  Plus, 
  Hospital, 
  MapPin, 
  Phone, 
  Mail,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { CreateClinicModal } from '@/components/modals/CreateClinicModal';

export default function ClinicsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchClinics = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/clinics?companyId=${user.companyId}`);
      setClinics(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.companyId) {
      setLoading(false);
      return;
    }

    fetchClinics();
  }, [user, authLoading, router]);

  if (authLoading || (loading && clinics.length === 0 && user?.companyId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium animate-pulse">Syncing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Clinics</h2>
            <p className="text-slate-500">Manage diagnostic centers and scan partners.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Clinic
          </button>
        </header>

        <CreateClinicModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          companyId={user?.companyId}
          onSuccess={fetchClinics}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium">Loading clinics...</p>
            </div>
          ) : clinics.length === 0 ? (
            <div className="col-span-full py-20 text-center card-premium bg-white border-dashed border-slate-200">
              <p className="text-slate-500">No clinics found. Start by adding your first clinic.</p>
            </div>
          ) : (
            clinics.map((clinic) => (
              <div key={clinic._id} className="card-premium group hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Hospital className="w-6 h-6" />
                  </div>
                  <button className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">{clinic.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-4">
                  <MapPin className="w-3.5 h-3.5" /> {clinic.location.area}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {clinic.phoneNumber}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" /> {clinic.email}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Assigned Cluster</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                    {clinic.clusterId?.name || 'Unassigned'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
