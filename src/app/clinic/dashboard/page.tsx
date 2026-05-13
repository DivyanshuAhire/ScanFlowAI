'use client';

import React from 'react';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  History, 
  PlusCircle,
  Bell,
  User,
  Loader2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useClinicAppointments } from '@/hooks/useClinicAppointments';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, startOfDay } from 'date-fns';

const AppointmentCard = ({ app }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
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
    <div className="text-right">
      <span className={cn(
        "px-3 py-1 rounded-full text-xs font-bold",
        app.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
      )}>
        {app.status}
      </span>
    </div>
  </div>
);

export default function ClinicDashboard() {
  const { user } = useUser();
  const { appointments, loading } = useClinicAppointments(user?.clinicId || null);

  const upcoming = appointments.filter(app => 
    isAfter(new Date(app.appointmentDate), startOfDay(new Date())) || 
    (format(new Date(app.appointmentDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
  );

  const previous = appointments.filter(app => 
    isBefore(new Date(app.appointmentDate), startOfDay(new Date()))
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-blue-600">ScanFlow <span className="text-slate-400 font-medium">| Clinic Portal</span></h1>
          <div className="hidden md:flex items-center gap-6">
            <a href="#" className="text-sm font-bold text-blue-600">Dashboard</a>
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900">Appointments</a>
            <a href="#" className="text-sm font-medium text-slate-500 hover:text-slate-900">History</a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-slate-900 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 lg:p-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Welcome, City Diagnostics</h2>
            <p className="text-slate-500 mt-1">Request and track your diagnostic scan appointments.</p>
          </div>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95">
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
                <a href="#" className="text-sm font-bold text-blue-600 hover:underline">View All</a>
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
                    <AppointmentCard key={i} app={app} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-400" /> Recent History
                </h3>
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
              <button className="w-full py-3 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors">
                Contact Admin
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Available Slots Today
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {['09:00', '10:30', '14:00', '15:30', '16:00', '17:30'].map(slot => (
                  <button key={slot} className="py-2 border border-slate-100 bg-slate-50 rounded-lg text-sm font-medium hover:border-blue-300 hover:bg-blue-50 transition-all">
                    {slot} AM
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
