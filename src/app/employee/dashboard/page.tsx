'use client';

import React, { useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Navigation,
  MessageCircle,
  LogOut,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { useEmployeeAppointments } from '@/hooks/useEmployeeAppointments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';

export default function EmployeeDashboard() {
  const router = useRouter();
  const { user, logout } = useUser();
  const { appointments, loading, setAppointments } = useEmployeeAppointments(user?.employeeId || null);

  const todayAppointments = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return appointments.filter(app => {
      if (!app.appointmentDate) return false;
      return format(new Date(app.appointmentDate), 'yyyy-MM-dd') === todayStr;
    });
  }, [appointments]);

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const updateStatus = async (appId: string, newStatus: string) => {
    try {
      await axios.patch(`/api/appointments/${appId}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      // Refresh local state
      setAppointments(prev => prev.map(a => a._id === appId ? { ...a, status: newStatus } : a));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-[50vh]">
      <header className="p-6 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">Hello, {user?.name || 'Technician'}</p>
          <h1 className="text-2xl font-bold">Your Schedule</h1>
        </div>
        <button onClick={handleLogout} className="p-3 bg-slate-800 rounded-2xl text-slate-400 hover:text-red-400 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="px-6 space-y-6">


        <section className="space-y-4">
          <h4 className="text-lg font-bold text-slate-300 px-2 flex items-center justify-between">
            Appointments
            <span className="text-xs font-medium text-slate-500">{format(new Date(), 'dd MMM yyyy')}</span>
          </h4>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-slate-500 text-sm">Fetching your scans...</p>
            </div>
          ) : todayAppointments.length === 0 ? (
            <div className="py-20 text-center bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
              <CalendarDays className="w-10 h-10 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">All clear for today!</p>
              <p className="text-slate-500 text-sm mt-1">Check back tomorrow for new assignments.</p>
            </div>
          ) : (
            todayAppointments.map((app, i) => (
              <div key={app._id} className="relative pl-8 group">
                {i !== todayAppointments.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-slate-800"></div>
                )}
                <div className={cn(
                  "absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-slate-900 flex items-center justify-center transition-colors",
                  app.status === 'COMPLETED' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-slate-700"
                )}></div>

                <div className={cn(
                  "p-5 rounded-3xl transition-all",
                  app.status !== 'COMPLETED' ? "bg-slate-800 ring-1 ring-slate-700" : "bg-slate-800/40 opacity-75"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                      <Clock className="w-4 h-4" /> {app.timeSlot}
                    </div>
                    {app.status === 'COMPLETED' && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded-full uppercase">Completed</span>
                    )}
                  </div>
                  
                  <h5 className="text-lg font-bold mb-1">{app.clinicId?.name}</h5>
                  <p className="text-slate-400 text-sm flex items-center gap-1 mb-4">
                    <MapPin className="w-3 h-3" /> {app.clinicId?.location?.area}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Scan Type</span>
                      <span className="text-xs font-bold text-slate-200">{app.scanType}</span>
                    </div>
                    {app.status !== 'COMPLETED' ? (
                      <button 
                        onClick={() => updateStatus(app._id, 'COMPLETED')}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
                      >
                        Complete Scan <CheckCircle className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                        <CheckCircle className="w-4 h-4" /> Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <div className="w-full py-6 mt-8 border-t border-slate-800 flex flex-col items-center justify-center gap-1 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Summary</p>
          <p className="text-sm font-bold text-slate-400">
            Today's Total Appointments: <span className="text-emerald-500 text-base font-black ml-1">{todayAppointments.length}</span>
          </p>
        </div>
      </main>
    </div>
  );
}
