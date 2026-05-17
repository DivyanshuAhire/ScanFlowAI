'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  CalendarCheck, 
  TrendingUp, 
  Activity,
  AlertCircle,
  Loader2,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  MapPin,
  Hospital,
  ChevronDown
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useCompanyStats } from '@/hooks/useCompanyStats';
import { useAppointments } from '@/hooks/useAppointments';
import { format } from 'date-fns';
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
  const { appointments, loading: appointmentsLoading } = useAppointments(user?.companyId || null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // History filters
  const [historyDay, setHistoryDay] = useState('ALL');
  const [historyMonth, setHistoryMonth] = useState('ALL');
  const [historyClinic, setHistoryClinic] = useState('ALL');
  const [historyEmployee, setHistoryEmployee] = useState('ALL');

  // Extract unique filter choices dynamically
  const historyClinics = useMemo(() => {
    const clinicsMap = new Map();
    appointments.forEach((app: any) => {
      if (app.clinicId?._id) clinicsMap.set(app.clinicId._id, app.clinicId.name);
    });
    return Array.from(clinicsMap.entries()).map(([id, name]) => ({ id, name }));
  }, [appointments]);

  const historyEmployees = useMemo(() => {
    const employeesMap = new Map();
    appointments.forEach((app: any) => {
      if (app.employeeId?._id) employeesMap.set(app.employeeId._id, app.employeeId.name);
    });
    return Array.from(employeesMap.entries()).map(([id, name]) => ({ id, name }));
  }, [appointments]);

  const historyMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    appointments.forEach((app: any) => {
      if (app.appointmentDate) {
        monthsSet.add(format(new Date(app.appointmentDate), 'yyyy-MM'));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [appointments]);

  const historyDays = useMemo(() => {
    const daysSet = new Set<string>();
    appointments.forEach((app: any) => {
      if (app.appointmentDate) {
        daysSet.add(format(new Date(app.appointmentDate), 'yyyy-MM-dd'));
      }
    });
    return Array.from(daysSet).sort().reverse();
  }, [appointments]);

  const filteredHistoryAppointments = useMemo(() => {
    let result = [...appointments];

    if (historyDay !== 'ALL') {
      result = result.filter(app => format(new Date(app.appointmentDate), 'yyyy-MM-dd') === historyDay);
    }
    if (historyMonth !== 'ALL') {
      result = result.filter(app => format(new Date(app.appointmentDate), 'yyyy-MM') === historyMonth);
    }
    if (historyClinic !== 'ALL') {
      result = result.filter(app => app.clinicId?._id === historyClinic);
    }
    if (historyEmployee !== 'ALL') {
      result = result.filter(app => app.employeeId?._id === historyEmployee);
    }

    // Default: Sort latest appointments on top
    result.sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    return result;
  }, [appointments, historyDay, historyMonth, historyClinic, historyEmployee]);

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
          <div className="lg:col-span-2 card-premium flex flex-col justify-between min-h-[500px]">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Appointment History</h3>
                  <p className="text-xs text-slate-500 font-medium">Browse and search clinic fulfillment records</p>
                </div>
                <CalendarIcon className="w-5 h-5 text-slate-400" />
              </div>

              {/* Advanced Filter Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {/* Month Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Month</label>
                  <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-lg overflow-hidden">
                    <select
                      value={historyMonth}
                      onChange={(e) => {
                        setHistoryMonth(e.target.value);
                        setHistoryDay('ALL'); // Reset day if month changes
                      }}
                      className="pl-2 pr-7 py-1.5 text-xs font-bold text-slate-700 bg-transparent focus:outline-none appearance-none cursor-pointer w-full focus:text-blue-600"
                    >
                      <option value="ALL">All Months</option>
                      {historyMonths.map(m => (
                        <option key={m} value={m}>
                          {format(new Date(`${m}-01`), 'MMMM yyyy')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                  </div>
                </div>

                {/* Day Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Day</label>
                  <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-lg overflow-hidden">
                    <select
                      value={historyDay}
                      onChange={(e) => {
                        setHistoryDay(e.target.value);
                        if (e.target.value !== 'ALL') {
                          // Sync month to selected day
                          setHistoryMonth(e.target.value.substring(0, 7));
                        }
                      }}
                      className="pl-2 pr-7 py-1.5 text-xs font-bold text-slate-700 bg-transparent focus:outline-none appearance-none cursor-pointer w-full focus:text-blue-600"
                    >
                      <option value="ALL">All Days</option>
                      {historyDays
                        .filter(d => historyMonth === 'ALL' || d.startsWith(historyMonth))
                        .map(d => (
                          <option key={d} value={d}>
                            {format(new Date(d), 'dd MMM yyyy')}
                          </option>
                        ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                  </div>
                </div>

                {/* Clinic Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Clinic</label>
                  <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-lg overflow-hidden">
                    <select
                      value={historyClinic}
                      onChange={(e) => setHistoryClinic(e.target.value)}
                      className="pl-2 pr-7 py-1.5 text-xs font-bold text-slate-700 bg-transparent focus:outline-none appearance-none cursor-pointer w-full truncate focus:text-blue-600"
                    >
                      <option value="ALL">All Clinics</option>
                      {historyClinics.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                  </div>
                </div>

                {/* Employee Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Employee</label>
                  <div className="relative flex items-center bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-lg overflow-hidden">
                    <select
                      value={historyEmployee}
                      onChange={(e) => setHistoryEmployee(e.target.value)}
                      className="pl-2 pr-7 py-1.5 text-xs font-bold text-slate-700 bg-transparent focus:outline-none appearance-none cursor-pointer w-full truncate focus:text-blue-600"
                    >
                      <option value="ALL">All Staff</option>
                      {historyEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Feed List */}
              <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1.5 no-scrollbar">
                {appointmentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-slate-400 text-xs font-medium">Loading history...</p>
                  </div>
                ) : filteredHistoryAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CalendarIcon className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="text-slate-500 font-bold text-sm">No matching history records</p>
                    <p className="text-slate-400 text-xs mt-1">Try resetting the dropdown filters</p>
                  </div>
                ) : (
                  filteredHistoryAppointments.map((app: any) => {
                    const statusColors: any = {
                      ASSIGNED: 'bg-blue-50 text-blue-700 border-blue-100',
                      COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                      IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-100',
                      REQUESTED: 'bg-amber-50 text-amber-700 border-amber-100',
                      CANCELLED: 'bg-rose-50 text-rose-700 border-rose-100',
                    };
                    return (
                      <div 
                        key={app._id} 
                        className="p-3 bg-white border border-slate-100 hover:border-slate-200 rounded-xl transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100">
                            <Hospital className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">{app.clinicId?.name}</h4>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" /> {app.clinicId?.location?.area}
                              </span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full hidden md:inline"></span>
                              <span className="flex items-center gap-1 font-semibold text-blue-600">
                                <CalendarIcon className="w-3 h-3" /> {format(new Date(app.appointmentDate), 'dd MMM')}
                              </span>
                              <span className="flex items-center gap-1 font-semibold text-violet-600">
                                <Clock className="w-3 h-3" /> {app.timeSlot}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-black uppercase">
                              {(app.employeeId?.name || '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-xs text-slate-600 font-medium">
                              {app.employeeId?.name || 'Unassigned'}
                            </span>
                          </div>
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", statusColors[app.status] || 'bg-slate-50 text-slate-600 border-slate-100')}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Showing {filteredHistoryAppointments.length} matching logs</span>
              <button 
                onClick={() => {
                  setHistoryDay('ALL');
                  setHistoryMonth('ALL');
                  setHistoryClinic('ALL');
                  setHistoryEmployee('ALL');
                }}
                className="text-blue-600 hover:text-blue-700 hover:underline font-bold"
              >
                Reset All Filters
              </button>
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
