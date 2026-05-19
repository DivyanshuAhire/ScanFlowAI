'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  History, 
  PlusCircle,
  Bell,
  User,
  LogOut,
  Loader2,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';
import { useClinicAppointments } from '@/hooks/useClinicAppointments';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';
import { CreateAppointmentModal } from '@/components/modals/CreateAppointmentModal';

const AppointmentCard = ({ app, onDelete }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
    <div className="flex gap-4">
      <div className="w-12 h-12 bg-blue-50 rounded-lg flex flex-col items-center justify-center text-blue-600">
        <span className="text-[10px] font-bold uppercase">{format(new Date(app.appointmentDate), 'MMM')}</span>
        <span className="text-lg font-bold leading-none">{format(new Date(app.appointmentDate), 'dd')}</span>
      </div>
      <div>
        <h4 className="font-bold text-slate-900">{app.scanType}</h4>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {app.timeSlot}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {app.employeeId?.name || 'Pending Assignment'}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <span className={cn(
        "px-3 py-1 rounded-full text-xs font-bold",
        app.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
      )}>
        {app.status}
      </span>
      <button 
        onClick={() => onDelete(app._id)}
        className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
        title="Delete Appointment"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

export default function ClinicDashboard() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const { appointments, loading: appointmentsLoading, fetchAppointments } = useClinicAppointments(user?.clinicId || null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('ALL');
  const [customHistoryDate, setCustomHistoryDate] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.clinicId) {
      setLoading(false);
      return;
    }

    setLoading(appointmentsLoading);
  }, [user, authLoading, appointmentsLoading, router]);

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

  if (authLoading || (loading && appointments.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium animate-pulse">Syncing Session...</p>
        </div>
      </div>
    );
  }

  const upcoming = appointments.filter(app => 
    isAfter(new Date(app.appointmentDate), startOfDay(new Date())) || 
    (format(new Date(app.appointmentDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
  );

  const previous = appointments.filter(app => {
    const isPast = isBefore(new Date(app.appointmentDate), startOfDay(new Date()));
    if (!isPast) return false;

    if (historyDateFilter === 'ALL') return true;

    const appDate = new Date(app.appointmentDate);
    const today = new Date();

    if (historyDateFilter === '7_DAYS') {
      const diffTime = Math.abs(today.getTime() - appDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }

    if (historyDateFilter === '30_DAYS') {
      const diffTime = Math.abs(today.getTime() - appDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }

    if (historyDateFilter === 'CUSTOM' && customHistoryDate) {
      const formattedAppDate = format(appDate, 'yyyy-MM-dd');
      return formattedAppDate === customHistoryDate;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-blue-600">ScanFlow <span className="text-slate-400 font-medium">| Clinic Portal</span></h1>
        </div>
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(prev => !prev)}
              className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors focus:outline-none"
            >
              <User className="w-4 h-4" />
            </button>
            
            {/* Profile Dropdown */}
            {showDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  <div className="p-4 border-b border-slate-50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.name}</p>
                  </div>
                  <div className="p-2">
                    <button 
                      onClick={() => {
                        localStorage.removeItem('scanflow_user');
                        localStorage.removeItem('scanflow_token');
                        window.location.href = '/auth/login';
                      }}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10 pb-[50vh]">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Welcome, {user?.name || 'Clinic Admin'}</h2>
            <p className="text-slate-500 mt-1">Request and track your diagnostic scan appointments.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
          >
            <PlusCircle className="w-5 h-5" /> Request New Scan
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" /> Upcoming Appointments
                </h3>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-10 bg-white rounded-xl border border-slate-100">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : upcoming.length === 0 ? (
                <div className="py-10 text-center bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-500 text-sm">No upcoming appointments scheduled.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((app, i) => (
                    <AppointmentCard key={i} app={app} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" /> Recent History
                </h3>
                
                <div className="flex items-center gap-2">
                  {historyDateFilter === 'CUSTOM' && (
                    <input 
                      type="date"
                      value={customHistoryDate}
                      onChange={(e) => setCustomHistoryDate(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm"
                    />
                  )}
                  <div className="relative flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 hover:border-slate-300 transition-colors shadow-sm">
                    <select
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none appearance-none cursor-pointer pr-4"
                    >
                      <option value="ALL">All Past Dates</option>
                      <option value="7_DAYS">Last 7 Days</option>
                      <option value="30_DAYS">Last 30 Days</option>
                      <option value="CUSTOM">Specific Date...</option>
                    </select>
                    <span className="pointer-events-none absolute right-2.5 text-slate-400 text-[8px]">▼</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                  </div>
                ) : previous.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-slate-500 text-sm">No historical records found.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Scan Type</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previous.map((row, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3 text-sm text-slate-600">{format(new Date(row.appointmentDate), 'dd MMM')}</td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-900">{row.scanType}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={cn(
                              "flex items-center gap-1 font-medium",
                              row.status === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-500'
                            )}>
                              {row.status === 'COMPLETED' && <CheckCircle className="w-3 h-3" />} {row.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <button 
                              onClick={() => handleDelete(row._id)}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="Delete Appointment"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-8">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl">
              <h4 className="font-bold text-xl mb-2">Need Help?</h4>
              <p className="text-blue-100 text-sm mb-6">Contact your assigned company administrator via WhatsApp for urgent queries.</p>
              <button 
                onClick={() => window.open('https://wa.me/910000000000', '_blank')}
                className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors"
              >
                Contact Admin
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Availability
              </h4>
              <p className="text-sm text-slate-400 italic">Technician availability is calculated in real-time based on current route optimization.</p>
            </div>
          </aside>
        </div>
      </main>

      <CreateAppointmentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        companyId={user?.companyId}
        clinicId={user?.clinicId}
        onSuccess={fetchAppointments}
      />
    </div>
  );
}
