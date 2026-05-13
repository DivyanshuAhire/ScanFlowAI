'use client';

import React from 'react';
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
  Loader2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useAppointments } from '@/hooks/useAppointments';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  const { user } = useUser();
  const { appointments, loading } = useAppointments(user?.companyId || null);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Appointments</h2>
            <p className="text-slate-500">Manage and schedule scan appointments.</p>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </header>

        <div className="card-premium overflow-hidden !p-0">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search clinics, areas, or employees..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <Filter className="w-4 h-4" /> Filters
              </button>
            </div>
            <div className="flex gap-2">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <CalendarIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">Fetching appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <CalendarIcon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">No appointments found</p>
                  <p className="text-slate-500 text-sm">Create your first appointment to see it here.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic & Area</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timing & Duration</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Scan Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((app: any) => (
                    <tr key={app._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900">{app.clinicId?.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {app.clinicId?.location?.area}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-400" /> {app.timeSlot}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{format(new Date(app.appointmentDate), 'dd MMM yyyy')}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                            <UserIcon className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-medium text-slate-900">{app.employeeId?.name || 'Unassigned'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
            <p className="text-sm text-slate-500">Showing 4 of 128 appointments</p>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50">Previous</button>
              <button className="px-3 py-1 text-sm bg-white border border-slate-200 rounded-md hover:bg-slate-50">Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
