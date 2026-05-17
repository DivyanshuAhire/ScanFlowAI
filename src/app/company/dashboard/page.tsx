'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { CreateAppointmentModal } from '@/components/modals/CreateAppointmentModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleExport = () => {
    if (!stats) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header Section
    csvContent += "=== OPERATIONS SUMMARY METRICS ===\n";
    csvContent += `Total Appointments,${stats.totalAppointments || 0}\n`;
    csvContent += `Active Employees,${stats.activeEmployees || 0}\n`;
    csvContent += `Route Efficiency,${stats.routeEfficiency || 0}%\n`;
    csvContent += `Pending Confirmations,${stats.pendingConfirmations || 0}\n\n`;
    
    // Employee Performance Section
    csvContent += "=== EMPLOYEE PERFORMANCE (LAST 30 DAYS) ===\n";
    csvContent += "Employee Name,Total Assigned,Completed,Completion Rate (%)\n";
    
    if (stats.employeeStats && stats.employeeStats.length > 0) {
      stats.employeeStats.forEach((emp: any) => {
        csvContent += `"${emp.name.replace(/"/g, '""')}",${emp.total},${emp.completed},${emp.completionRate}%\n`;
      });
    } else {
      csvContent += "No employee data available\n";
    }
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `operations_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-24 pb-[50vh]">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Operations Overview</h2>
            <p className="text-slate-500 font-medium text-sm">Real-time monitoring of your diagnostic flow.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={handleExport}
              disabled={!stats}
              className="flex-1 md:flex-none px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Export Report
            </button>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 md:flex-none btn-primary"
            >
              Create Appointment
            </button>
          </div>
        </header>

        <CreateAppointmentModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          companyId={user?.companyId}
          onSuccess={() => window.location.reload()}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Appointments" 
            value={stats?.totalAppointments || '0'} 
            icon={CalendarCheck} 
            color="bg-blue-600" 
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
              <p className="text-slate-400 text-sm italic">Analytics visualization will appear as data matures.</p>
            </div>
          </div>

          <div className="card-premium">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Employee Performance</h3>
                <p className="text-xs text-slate-500 font-medium">Fulfillment rate over the last 30 days</p>
              </div>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="space-y-6">
              {!stats?.employeeStats || stats.employeeStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-center">
                  <Users className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-slate-400 text-sm italic px-4">No active employee performance records found.</p>
                </div>
              ) : (
                stats.employeeStats.map((emp: any) => (
                  <div key={emp._id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black uppercase shrink-0">
                          {emp.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-bold text-slate-800 truncate max-w-[120px]">{emp.name}</span>
                      </div>
                      <span className="text-xs font-black text-slate-500 shrink-0">
                        {emp.completed}/{emp.total} Done
                      </span>
                    </div>
                    
                    <div className="relative pt-1">
                      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-slate-100">
                        <div
                          style={{ width: `${emp.completionRate}%` }}
                          className={cn(
                            "shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-500",
                            emp.completionRate >= 80 ? "bg-emerald-500" :
                            emp.completionRate >= 50 ? "bg-amber-500" : "bg-slate-400"
                          )}
                        />
                      </div>
                      <span className="absolute -top-3.5 right-0 text-[9px] font-black text-slate-600">
                        {emp.completionRate}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
