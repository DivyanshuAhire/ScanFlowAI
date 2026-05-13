'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  Activity,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useCompanyStats } from '@/hooks/useCompanyStats';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon: Icon, color, trend, loading }: any) => (
  <div className="card-premium">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {loading ? (
          <div className="h-8 w-16 bg-slate-100 animate-pulse rounded mt-1"></div>
        ) : (
          <h3 className="text-2xl font-bold mt-1 text-slate-900">{value}</h3>
        )}
        {trend && !loading && (
          <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-lg bg-opacity-10", color)}>
        <Icon className={cn("w-6 h-6", color.replace('bg-', 'text-'))} />
      </div>
    </div>
  </div>
);

export default function CompanyDashboard() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { stats, loading: statsLoading } = useCompanyStats(user?.companyId || null);
  const [loading, setLoading] = useState(true);

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

    setLoading(statsLoading);
  }, [user, authLoading, statsLoading, router]);

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
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Operations Overview</h2>
            <p className="text-slate-500">Real-time monitoring of your diagnostic flow.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              Export Report
            </button>
            <button className="btn-primary">
              Create Appointment
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Appointments" 
            value={stats?.totalAppointments || '0'} 
            icon={CalendarCheck} 
            color="bg-blue-600" 
            trend="+12% from last month"
            loading={loading}
          />
          <StatCard 
            title="Active Employees" 
            value={stats?.activeEmployees || '0'} 
            icon={Users} 
            color="bg-indigo-600" 
            loading={loading}
          />
          <StatCard 
            title="Route Efficiency" 
            value={`${stats?.routeEfficiency || '0'}%`} 
            icon={Activity} 
            color="bg-emerald-600" 
            trend="+2.4% improved"
            loading={loading}
          />
          <StatCard 
            title="Pending Confirmations" 
            value={stats?.pendingConfirmations || '0'} 
            icon={AlertCircle} 
            color="bg-amber-600" 
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card-premium min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Weekly Appointment Flow</h3>
              <select className="bg-slate-50 border border-slate-200 rounded-md text-xs p-1">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>
            {/* Chart Placeholder */}
            <div className="w-full h-64 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-300">
              <p className="text-slate-400 text-sm">Analytics Graph Component Here</p>
            </div>
          </div>

          <div className="card-premium">
            <h3 className="font-bold text-slate-900 text-lg mb-6">Cluster Load Balancing</h3>
            <div className="space-y-6">
              {[
                { name: 'Andheri East', load: 85, color: 'bg-blue-600' },
                { name: 'Powai', load: 62, color: 'bg-indigo-600' },
                { name: 'Bandra West', load: 45, color: 'bg-emerald-600' },
                { name: 'Malad West', load: 92, color: 'bg-red-500' },
              ].map(cluster => (
                <div key={cluster.name}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">{cluster.name}</span>
                    <span className="text-slate-500">{cluster.load}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-1000", cluster.color)} 
                      style={{ width: `${cluster.load}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
