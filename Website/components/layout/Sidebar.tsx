'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  LayoutDashboard, 
  Map, 
  Stethoscope, 
  Users, 
  CalendarDays, 
  CalendarPlus, 
  ClipboardList, 
  UserCheck, 
  Activity, 
  Settings, 
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  // Determine menu items based on role
  const getMenuItems = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Route Map', href: '/admin/map', icon: Map },
          { name: 'Clinics', href: '/admin/clinics', icon: Stethoscope },
          { name: 'Operators', href: '/admin/operators', icon: Users },
        ];
      case 'COMPANY_OPERATOR':
        return [
          { name: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
          { name: 'Book Scan', href: '/operator/book', icon: CalendarPlus },
          { name: 'Appointments', href: '/operator/appointments', icon: ClipboardList },
          { name: 'Assign Route', href: '/operator/assign', icon: CalendarDays },
          { name: 'Technicians', href: '/operator/employees', icon: UserCheck },
          { name: 'Scan Types', href: '/operator/scantypes', icon: Activity },
        ];
      case 'CLINIC_OPERATOR':
        return [
          { name: 'Book Scan', href: '/clinic/book', icon: CalendarPlus },
        ];
      case 'EMPLOYEE':
        return [
          { name: 'My Route', href: '/employee/route', icon: Map },
        ];
      default:
        return [];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col justify-between h-[calc(100vh-64px)] sticky top-16 hidden md:flex z-20">
      <div className="py-6 px-4 space-y-7 flex-1 overflow-y-auto">
        
        {/* Navigation Section */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">Main Navigation</p>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 font-medium text-sm group ${
                  isActive 
                    ? 'bg-accent text-white shadow-md shadow-accent/20' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 transition-transform duration-150 ${isActive ? '' : 'text-slate-400 group-hover:text-white group-hover:scale-105'}`} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Logout Panel */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 font-medium text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 group cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 text-red-400 transition-transform duration-150 group-hover:translate-x-0.5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
