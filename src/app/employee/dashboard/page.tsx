'use client';

import React from 'react';
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
    <div className="min-h-screen bg-slate-900 text-white pb-10">
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
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Assigned Route</p>
            <h3 className="text-xl font-bold mb-4">Western Suburbs - Active</h3>
            <div className="flex items-center gap-4">
              <button className="flex-1 bg-white text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-xl">
                <Navigation className="w-4 h-4" /> Start Route
              </button>
              <button className="w-12 h-12 bg-blue-500/30 backdrop-blur rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        </div>

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
          ) : appointments.length === 0 ? (
            <div className="py-20 text-center bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
              <CalendarDays className="w-10 h-10 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">All clear for now!</p>
              <p className="text-slate-500 text-sm mt-1">Check back later for new assignments.</p>
            </div>
          ) : (
            appointments.map((app, i) => (
              <div key={app._id} className="relative pl-8 group">
                {i !== appointments.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-slate-800"></div>
                )}
                <div className={cn(
                  "absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-slate-900 flex items-center justify-center",
                  app.status === 'IN_PROGRESS' ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-slate-700"
                )}></div>

                <div className={cn(
                  "p-5 rounded-3xl transition-all",
                  app.status === 'IN_PROGRESS' ? "bg-slate-800 ring-2 ring-blue-500/50" : "bg-slate-800/50"
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                      <Clock className="w-4 h-4" /> {app.timeSlot}
                    </div>
                    {app.status === 'IN_PROGRESS' && (
                      <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-2 py-1 rounded-full uppercase animate-pulse">Active</span>
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
                    <button 
                      onClick={() => {
                        const nextStatus = app.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
                        updateStatus(app._id, nextStatus);
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95",
                        app.status === 'IN_PROGRESS' ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"
                      )}
                    >
                      {app.status === 'IN_PROGRESS' ? 'Complete' : 'Check In'} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <button className="w-full py-5 bg-slate-800 text-slate-400 rounded-3xl font-bold border border-slate-700/50 flex items-center justify-center gap-2 hover:bg-slate-750 transition-all">
          <CheckCircle className="w-5 h-5" /> Finish Day
        </button>
      </main>
    </div>
  );
}
