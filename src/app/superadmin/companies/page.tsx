'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Building2, 
  Plus, 
  Search, 
  Mail, 
  Phone,
  ShieldCheck,
  Loader2,
  MoreVertical,
  ChevronRight
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';
import { ManageCompanyModal } from '@/components/modals/ManageCompanyModal';

export default function SuperAdminCompanies() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/companies');
      setCompanies(res.data);
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
    fetchCompanies();
  }, [user, authLoading]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Partner Organizations</h2>
            <p className="text-slate-500 font-medium">Manage and monitor all company tenants.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
          >
            <Plus className="w-4 h-4" /> Add New Company
          </button>
        </header>

        <div className="card-premium mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search companies by name or email..."
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {companies.map(company => (
              <div key={company._id} className="card-premium group hover:border-blue-200 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-xl">
                      {company.name[0]}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{company.name}</h3>
                      <p className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {company.email}
                      </p>
                    </div>
                  </div>
                  <button className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Type</p>
                    <p className="text-sm font-bold text-indigo-600">{company.subscriptionPlan}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</p>
                    <p className="text-sm font-bold text-slate-700">{company.phoneNumber || 'Not provided'}</p>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-xs font-black text-emerald-600 uppercase">Account Active</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedCompany(company);
                      setIsManageModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-blue-600 font-bold text-sm hover:gap-2 transition-all"
                  >
                    Manage Tenant <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <CreateCompanyModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchCompanies}
        />
        <ManageCompanyModal 
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          company={selectedCompany}
        />
      </main>
    </div>
  );
}
