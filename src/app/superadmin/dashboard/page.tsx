'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Users, 
  Activity, 
  ShieldAlert,
  Plus,
  ArrowRight,
  Loader2,
  Globe
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { CreateCompanyModal } from '@/components/modals/CreateCompanyModal';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="card-premium">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-2xl font-bold mt-1 text-slate-900">{value}</h3>
      </div>
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function SuperAdminDashboard() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      const res = await axios.get('/api/superadmin/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
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

    fetchStats();
  }, [user, authLoading, router]);

  if (authLoading || (loading && !stats)) {
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
        <header className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">System Control Panel</h2>
            <p className="text-slate-500 font-medium">Global infrastructure and partner management.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => toast.info('System report generation started...')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
            >
              Export Global Report
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
            >
              <Plus className="w-4 h-4" /> Register Company
            </button>
          </div>
        </header>

        <CreateCompanyModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchStats}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard 
            title="Total Companies" 
            value={stats?.totalCompanies || '0'} 
            icon={Building2} 
            color="bg-blue-600" 
          />
          <StatCard 
            title="Global Users" 
            value={stats?.totalUsers || '0'} 
            icon={Users} 
            color="bg-indigo-600" 
          />
          <StatCard 
            title="Active Clinics" 
            value={stats?.totalClinics || '0'} 
            icon={Globe} 
            color="bg-emerald-600" 
          />
          <StatCard 
            title="System Health" 
            value="Operational" 
            icon={ShieldAlert} 
            color="bg-emerald-600" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card-premium">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900">Recent Partner Onboarding</h3>
              <button 
                onClick={() => router.push('/superadmin/companies')}
                className="text-blue-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all"
              >
                View All Partners <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="overflow-hidden border border-slate-100 rounded-2xl">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Company</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Plan</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stats?.recentCompanies || []).map((company: any) => (
                    <tr key={company._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                            {company.name[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{company.name}</p>
                            <p className="text-xs text-slate-400">{company.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-black uppercase">
                          {company.subscriptionPlan}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          Active
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-premium h-fit">
            <h3 className="text-xl font-bold text-slate-900 mb-8">System Activity</h3>
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Activity className="w-10 h-10 text-slate-100 mb-3" />
              <p className="text-slate-400 text-sm italic">System logs and audit trails will appear here as infrastructure scaling events occur.</p>
            </div>
            <button 
              onClick={() => router.push('/superadmin/logs')}
              className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200"
            >
              View All Logs
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
