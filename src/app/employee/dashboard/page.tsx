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
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function EmployeeDashboard() {
  const todayAppointments = [
    { id: '1', clinic: 'XYZ Diagnostics', area: 'Andheri East', time: '11:00 AM', status: 'IN_PROGRESS' },
    { id: '2', clinic: 'ABC Scan Center', area: 'Powai', time: '01:30 PM', status: 'UPCOMING' },
    { id: '3', clinic: 'City Imaging', area: 'Bandra', time: '04:00 PM', status: 'UPCOMING' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-10">
      {/* Mobile Header */}
      <header className="p-6 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">Hello, John</p>
          <h1 className="text-2xl font-bold">Your Schedule</h1>
        </div>
        <button className="p-3 bg-slate-800 rounded-2xl text-slate-400">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Date Selector */}
      <div className="px-6 mb-8 flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {[
          { day: 'Mon', date: '11' },
          { day: 'Tue', date: '12' },
          { day: 'Wed', date: '13', active: true },
          { day: 'Thu', date: '14' },
          { day: 'Fri', date: '15' },
        ].map((d) => (
          <div 
            key={d.date}
            className={cn(
              "flex flex-col items-center min-w-[60px] py-4 rounded-2xl transition-all",
              d.active ? "bg-blue-600 shadow-lg shadow-blue-900" : "bg-slate-800 text-slate-400"
            )}
          >
            <span className="text-[10px] uppercase font-bold mb-1">{d.day}</span>
            <span className="text-lg font-black">{d.date}</span>
          </div>
        ))}
      </div>

      <main className="px-6 space-y-6">
        {/* Active Route Info */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Current Route</p>
            <h3 className="text-xl font-bold mb-4">Western Suburbs - Line A</h3>
            <div className="flex items-center gap-4">
              <button className="flex-1 bg-white text-blue-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-xl">
                <Navigation className="w-4 h-4" /> Start Route
              </button>
              <button className="w-12 h-12 bg-blue-500/30 backdrop-blur rounded-xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* Decorative Circle */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Timeline */}
        <section className="space-y-4">
          <h4 className="text-lg font-bold text-slate-300 px-2">Appointments</h4>
          {todayAppointments.map((app, i) => (
            <div key={app.id} className="relative pl-8 group">
              {/* Timeline Line */}
              {i !== todayAppointments.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-slate-800"></div>
              )}
              {/* Timeline Bullet */}
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
                    <Clock className="w-4 h-4" /> {app.time}
                  </div>
                  {app.status === 'IN_PROGRESS' && (
                    <span className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-2 py-1 rounded-full uppercase">Active</span>
                  )}
                </div>
                
                <h5 className="text-lg font-bold mb-1">{app.clinic}</h5>
                <p className="text-slate-400 text-sm flex items-center gap-1 mb-4">
                  <MapPin className="w-3 h-3" /> {app.area}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
                  <button className="text-xs font-bold text-blue-400 hover:underline">View Scan Details</button>
                  <button className={cn(
                    "px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2",
                    app.status === 'IN_PROGRESS' ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"
                  )}>
                    {app.status === 'IN_PROGRESS' ? 'Complete' : 'Check In'} <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* End Day Button */}
        <button className="w-full py-5 bg-slate-800 text-slate-400 rounded-3xl font-bold border border-slate-700/50 flex items-center justify-center gap-2 hover:bg-slate-750 transition-all">
          <CheckCircle className="w-5 h-5" /> Finish Day
        </button>
      </main>
    </div>
  );
}
