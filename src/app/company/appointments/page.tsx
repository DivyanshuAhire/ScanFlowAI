'use client';

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Calendar as CalendarIcon,
  Clock,
  User as UserIcon,
  MapPin,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useAppointments } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CreateAppointmentModal } from '@/components/modals/CreateAppointmentModal';

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    ASSIGNED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
    REQUESTED: 'bg-amber-100 text-amber-700',
    CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-semibold", styles[status] || 'bg-slate-100 text-slate-700')}>
      {status.replace('_', ' ')}
    </span>
  );
};

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { appointments, loading: appointmentsLoading, setAppointments } = useAppointments(user?.companyId || null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Optimization State
  const next7Days = useMemo(() => {
    const days = [];
    let current = new Date();
    while (days.length < 7) {
      if (current.getDay() !== 0) { // Skip Sunday
        days.push({
          dateStr: current.toISOString().split('T')[0],
          label: format(current, 'EEE, MMM dd')
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, []);

  const [optimizeDate, setOptimizeDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [optimizing, setOptimizing] = useState(false);

  const handleOptimize = async () => {
    if (!user?.companyId || !optimizeDate) return;
    try {
      setOptimizing(true);
      const res = await axios.post('/api/appointments/optimize', { companyId: user.companyId, date: optimizeDate });
      toast.success(`Successfully re-assigned ${res.data.count} appointments for ${optimizeDate}`);
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to optimize schedule');
    } finally {
      setOptimizing(false);
    }
  };

  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

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

    setLoading(appointmentsLoading);
  }, [user, authLoading, appointmentsLoading]);

  const fetchAppointments = async () => {
    if (!user?.companyId) return;
    const res = await axios.get(`/api/appointments?companyId=${user.companyId}`);
    setAppointments(res.data);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      await axios.delete(`/api/appointments/${id}`);
      toast.success('Appointment deleted');
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete appointment');
    }
  };

  const uniqueEmployees = useMemo(() => {
    const employeesMap = new Map();
    appointments.forEach((app: any) => {
      if (app.employeeId && app.employeeId._id) {
        employeesMap.set(app.employeeId._id, app.employeeId.name);
      }
    });
    return Array.from(employeesMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    let result = [...appointments];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(app => 
        app.clinicId?.name?.toLowerCase().includes(q) ||
        app.clinicId?.location?.area?.toLowerCase().includes(q) ||
        app.employeeId?.name?.toLowerCase().includes(q) ||
        app.scanType?.toLowerCase().includes(q)
      );
    }

    // Employee Filter
    if (employeeFilter !== 'ALL') {
      result = result.filter(app => {
        if (employeeFilter === 'UNASSIGNED') return !app.employeeId;
        return app.employeeId?._id === employeeFilter;
      });
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter(app => app.status === statusFilter);
    }

    // Urgency Filter
    if (urgencyFilter !== 'ALL') {
      result = result.filter(app => app.urgency === urgencyFilter);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortConfig.key) {
        case 'clinic':
          aVal = a.clinicId?.name || '';
          bVal = b.clinicId?.name || '';
          break;
        case 'appointmentDate':
          aVal = new Date(a.appointmentDate).getTime();
          bVal = new Date(b.appointmentDate).getTime();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt || 0).getTime();
          bVal = new Date(b.createdAt || 0).getTime();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'employee':
          aVal = a.employeeId?.name || 'zzz'; // Put unassigned at the end
          bVal = b.employeeId?.name || 'zzz';
          break;
        default:
          aVal = a[sortConfig.key];
          bVal = b[sortConfig.key];
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [appointments, searchQuery, statusFilter, urgencyFilter, employeeFilter, sortConfig]);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-24 pb-[50vh]">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div className="flex-1">
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Appointments</h2>
            <p className="text-slate-500 font-medium text-sm">Real-time schedule management.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search clinic or tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 shrink-0">
              <div className="relative flex items-center pl-2 border-r border-slate-100 pr-1">
                <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
                <select 
                  value={optimizeDate}
                  onChange={(e) => setOptimizeDate(e.target.value)}
                  className="pl-6 pr-6 py-1.5 text-sm outline-none font-bold text-slate-700 bg-transparent cursor-pointer appearance-none hover:text-indigo-600 transition-colors"
                >
                  {next7Days.map(day => (
                    <option key={day.dateStr} value={day.dateStr}>
                      {day.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
              </div>
              <button 
                onClick={handleOptimize}
                disabled={optimizing}
                className="btn-secondary flex items-center justify-center gap-2 text-xs py-1.5 px-3 whitespace-nowrap bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none rounded-lg font-bold disabled:opacity-50"
              >
                {optimizing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Optimize
              </button>
            </div>

            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" /> New Appointment
            </button>
          </div>
        </header>

        {/* Filters and Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mr-2 whitespace-nowrap">Sort By:</span>
          <button 
            onClick={() => toggleSort('appointmentDate')}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
              sortConfig.key === 'appointmentDate' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            Time {sortConfig.key === 'appointmentDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => toggleSort('clinic')}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
              sortConfig.key === 'clinic' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            Clinic {sortConfig.key === 'clinic' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => toggleSort('employee')}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-bold transition-all border whitespace-nowrap",
              sortConfig.key === 'employee' ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            Employee {sortConfig.key === 'employee' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
          </button>
          </div>
          
          <div className="relative flex items-center shrink-0 bg-white border border-slate-200 hover:border-slate-300 transition-colors rounded-xl overflow-hidden shadow-sm">
            <div className="pl-3 pr-2 py-1.5 bg-slate-50/50 border-r border-slate-100 flex items-center pointer-events-none">
               <Filter className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="px-3 pr-8 py-1.5 text-xs font-bold text-slate-700 bg-transparent focus:outline-none appearance-none cursor-pointer w-full hover:text-blue-600 transition-colors"
            >
              <option value="ALL">All Employees</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {uniqueEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
          </div>
        </div>

        <CreateAppointmentModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          companyId={user?.companyId}
          onSuccess={fetchAppointments}
        />

        <div className="card-premium overflow-hidden !p-0">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">Fetching appointments...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Search className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">No matching appointments</p>
                  <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Appointment Details
                    </th>
                    <th 
                      className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => toggleSort('appointmentDate')}
                    >
                      <div className="flex items-center gap-1">Timing & Duration <SortIcon column="appointmentDate" /></div>
                    </th>
                    <th 
                      className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => toggleSort('employee')}
                    >
                      <div className="flex items-center gap-1">Employee <SortIcon column="employee" /></div>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Scan Type</th>
                    <th 
                      className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center gap-1">Status <SortIcon column="status" /></div>
                    </th>
                    <th className="hidden lg:table-cell px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.map((app: any) => (
                    <tr key={app._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div>
                            <p className="font-bold text-slate-900">{app.clinicId?.name}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {app.clinicId?.location?.area}
                            </p>
                          </div>
                          
                          {/* Mobile-only info stack */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 lg:hidden">
                            <p className="text-[11px] font-black text-blue-600 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" /> {format(new Date(app.appointmentDate), 'dd MMM')}
                            </p>
                            <p className="text-[11px] font-black text-violet-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {app.timeSlot}
                            </p>
                            <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                              <UserIcon className="w-3 h-3 text-slate-400" /> {app.employeeId?.name || 'Unassigned'}
                            </p>
                            <StatusBadge status={app.status} />
                            <button 
                              onClick={() => handleDelete(app._id)}
                              className="ml-auto p-1.5 text-rose-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" /> {app.timeSlot}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{format(new Date(app.appointmentDate), 'dd MMM yyyy')}</p>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-medium text-slate-900">{app.employeeId?.name || 'Unassigned'}</p>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{app.scanType}</p>
                          <p className={cn(
                            "text-[10px] font-bold uppercase mt-1 px-1.5 py-0.5 rounded inline-block",
                            app.urgency === 'HIGH' ? 'text-rose-600 bg-rose-50' : 'text-slate-500 bg-slate-100'
                          )}>
                            {app.urgency} Urgency
                          </p>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="hidden lg:table-cell px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(app._id)}
                          className="p-2 text-rose-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
                          title="Delete Appointment"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-center">
            <p className="text-sm font-medium text-slate-500">
              Showing {filteredAppointments.length} of {appointments.length} appointments
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
