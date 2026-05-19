'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, 
  CalendarDays, 
  UserCheck, 
  Activity, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  CalendarPlus,
  Compass
} from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  todayBookings: number;
  activeTechs: number;
  unassigned: number;
}

export default function OperatorDashboard() {
  const [stats, setStats] = useState<Stats>({ todayBookings: 0, activeTechs: 0, unassigned: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const [apptsRes, techsRes, previewRes] = await Promise.all([
          fetch(`/api/appointments?date=${todayStr}`),
          fetch('/api/employees'),
          fetch(`/api/assignments/preview?date=${todayStr}`)
        ]);

        const apptsData = await apptsRes.json();
        const techsData = await techsRes.json();
        const previewData = await previewRes.json();

        const todayAppts = apptsData.appointments || [];
        const unassignedApptsCount = previewData.preview?.unassigned?.length || 0;

        setStats({
          todayBookings: todayAppts.length,
          activeTechs: techsData.employees?.filter((e: any) => e.isActive).length || 0,
          unassigned: unassignedApptsCount
        });
      } catch (e) {
        console.error('Error loading dashboard stats:', e);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardStats();
  }, [todayStr]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading dispatcher dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dispatcher Desk</h1>
          <p className="text-slate-500 text-sm mt-1">Book dental scans, manage mobile technician groups, and perform EOD auto-assignment locks.</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold self-start sm:self-auto flex items-center gap-2 shadow-lg shadow-slate-950/10 border border-slate-800">
          <Compass className="h-4 w-4 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
          <span>Active Route Dispatcher</span>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Today's Scans */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Scans</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">{stats.todayBookings}</span>
          </div>
          <div className="bg-sky-50 text-sky-500 p-4 rounded-2xl">
            <ClipboardList className="h-6 w-6" />
          </div>
        </div>

        {/* Active Technicians */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Field Technicians</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">{stats.activeTechs}</span>
          </div>
          <div className="bg-emerald-50 text-emerald-500 p-4 rounded-2xl">
            <UserCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Unassigned Warnings */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unassigned Bookings</span>
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight block flex items-center gap-1.5">
              {stats.unassigned}
              {stats.unassigned > 0 && (
                <span className="bg-red-50 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 animate-pulse">
                  Warning
                </span>
              )}
            </span>
          </div>
          <div className="bg-amber-50 text-amber-500 p-4 rounded-2xl">
            <AlertCircle className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Dispatch Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Core Dispatch Workflows */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Core Dispatch Desk</h3>
            <p className="text-slate-500 text-xs">Run real-time appointment bookings and run EOD scheduler compilers.</p>
          </div>
          
          <div className="space-y-4">
            <Link 
              href="/operator/book" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-sky-500/10 p-3 rounded-xl text-sky-500">
                  <CalendarPlus className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Book Scan Appointment</p>
                  <p className="text-xs text-slate-400">Step-by-step smart booking wizard with scoring</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link 
              href="/operator/assign" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-xl text-purple-500">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">End-of-Day Auto-Assignment</p>
                  <p className="text-xs text-slate-400">Preview daily dispatch route sheets & lock schedules</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Database & Field Configuration */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">System Node Setup</h3>
            <p className="text-slate-500 text-xs">Configure field technician lists and active scan type configurations.</p>
          </div>

          <div className="space-y-4">
            <Link 
              href="/operator/employees" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Field Technicians List</p>
                  <p className="text-xs text-slate-400">Add mobile operators, toggle statuses, sync logins</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            <Link 
              href="/operator/scantypes" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Dental Scan Types & Service Times</p>
                  <p className="text-xs text-slate-400">Setup scan service durations (Dental, Ortho, CBCT)</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
