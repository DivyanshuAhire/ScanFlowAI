'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Building, 
  Map, 
  Users, 
  CalendarDays, 
  ArrowRight, 
  Loader2, 
  ShieldAlert,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

interface Stats {
  clinics: number;
  routes: number;
  employees: number;
  bookings: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ clinics: 0, routes: 0, employees: 0, bookings: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [clinicsRes, routesRes, employeesRes, bookingsRes] = await Promise.all([
          fetch('/api/clinics'),
          fetch('/api/routes'),
          fetch('/api/employees'),
          fetch(`/api/appointments?date=${todayStr}`)
        ]);

        const clinicsData = await clinicsRes.json();
        const routesData = await routesRes.json();
        const employeesData = await employeesRes.json();
        const bookingsData = await bookingsRes.json();

        setStats({
          clinics: clinicsData.clinics?.length || 0,
          routes: routesData.routes?.length || 0,
          employees: employeesData.employees?.length || 0,
          bookings: bookingsData.appointments?.length || 0
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [todayStr]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading Dashboard Stats...</span>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Clinics', value: stats.clinics, icon: Building, color: 'text-sky-500 bg-sky-50', border: 'border-sky-100', href: '/admin/clinics' },
    { name: 'Active Routes', value: stats.routes, icon: Map, color: 'text-purple-500 bg-purple-50', border: 'border-purple-100', href: '/admin/map' },
    { name: 'Active Technicians', value: stats.employees, icon: Users, color: 'text-amber-500 bg-amber-50', border: 'border-amber-100', href: '/operator/employees' },
    { name: "Today's Bookings", value: stats.bookings, icon: CalendarDays, color: 'text-emerald-500 bg-emerald-50', border: 'border-emerald-100', href: '/operator/appointments' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Welcome Title Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Admin Control Panel</h1>
          <p className="text-slate-500 text-sm mt-1">Manage global system settings, set dispatch HQ, view auto-routing layers, and audit database nodes.</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-semibold self-start md:self-auto flex items-center gap-2 shadow-lg shadow-slate-950/10 border border-slate-800">
          <ShieldAlert className="h-4 w-4 text-sky-400" />
          <span>System Root Access</span>
        </div>
      </div>

      {/* Stats Counter Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.name} 
              className={`bg-white border ${card.border} rounded-3xl p-6 shadow-sm shadow-slate-100/50 flex items-center justify-between transition-all duration-300 hover:shadow-md hover:scale-[1.01]`}
            >
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">{card.name}</span>
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">{card.value}</span>
              </div>
              <div className={`p-4 rounded-2xl ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Administrative Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Geographic Controls Column */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Geographical Controls</h3>
            <p className="text-slate-500 text-xs">Configure the spatial core of the dispatch operations.</p>
          </div>
          <div className="space-y-4">
            <Link 
              href="/admin/map" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-sky-500/10 p-3 rounded-xl text-sky-500">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Set Company Dispatch HQ</p>
                  <p className="text-xs text-slate-400">Click on Leaflet map to establish root coordinates</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/admin/map" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-purple-500/10 p-3 rounded-xl text-purple-500">
                  <Map className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Auditing Route Overlaps</p>
                  <p className="text-xs text-slate-400">Inspect road directions and clustering buffers</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Database Management Column */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Database Nodes & Auth</h3>
            <p className="text-slate-500 text-xs">Handle operator and clinic dispatch credentials.</p>
          </div>
          <div className="space-y-4">
            <Link 
              href="/admin/clinics" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-500">
                  <Building className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">Dental Clinic Dispatch Panel</p>
                  <p className="text-xs text-slate-400">Add clinics with map nodes and activate operators logins</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
            <Link 
              href="/admin/operators" 
              className="flex items-center justify-between p-5 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-amber-500/10 p-3 rounded-xl text-amber-500">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">System Operators Management</p>
                  <p className="text-xs text-slate-400">Add and authorize company dispatcher roles</p>
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
