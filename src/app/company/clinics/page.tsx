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
import { EditClinicModal } from '@/components/modals/EditClinicModal';

export default function ClinicsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);

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
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Clinics</h2>
            <p className="text-slate-500 font-medium text-sm">Manage diagnostic centers and scan partners.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
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

        <EditClinicModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          companyId={user?.companyId}
          clinic={selectedClinic}
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
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Hospital className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedClinic(clinic);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">{clinic.name}</h3>
                <p className="text-sm text-slate-500 hidden md:flex items-center gap-1.5 mb-4">
                  <MapPin className="w-3.5 h-3.5" /> {clinic.location.area}
                </p>

                <div className="space-y-2.5 pt-4 border-t border-slate-100 hidden md:block">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {clinic.phoneNumber}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" /> {clinic.email}
                  </div>
                </div>

                <div className="mt-6 hidden md:flex items-center justify-between">
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
