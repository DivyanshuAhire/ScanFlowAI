'use client';

import { useAuth } from '@/lib/context/AuthContext';
import { Activity, User, Shield, Briefcase, Building, LogOut } from 'lucide-react';

export default function TopNav() {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Shield className="h-3 w-3" /> Admin
          </span>
        );
      case 'COMPANY_OPERATOR':
        return (
          <span className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/20 text-sky-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Briefcase className="h-3 w-3" /> Operator
          </span>
        );
      case 'CLINIC_OPERATOR':
        return (
          <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <Building className="h-3 w-3" /> Clinic Op
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            <User className="h-3 w-3" /> Technician
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm shadow-slate-100/50">
      
      {/* Brand Logo */}
      <div className="flex items-center gap-2.5">
        <div className="bg-slate-900 text-white p-2 rounded-xl">
          <Activity className="h-5 w-5 animate-pulse" />
        </div>
        <span className="text-xl font-extrabold tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text">
          ScanFlow
        </span>
      </div>

      {/* Right side: Profile Controls */}
      <div className="flex items-center gap-4">
        {/* Profile Card */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-100/50 pl-3 pr-4 py-1.5 rounded-2xl">
          <div className="bg-slate-200 text-slate-700 h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm select-none">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-800 leading-none mb-1">{user.name}</span>
            <div className="flex leading-none">{getRoleBadge(user.role)}</div>
          </div>
        </div>

        {/* Mobile quick-logout button */}
        <button
          onClick={logout}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-50 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

    </header>
  );
}
