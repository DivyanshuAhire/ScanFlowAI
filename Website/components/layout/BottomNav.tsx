'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  LayoutDashboard, 
  Map, 
  Stethoscope, 
  Users, 
  CalendarPlus, 
  ClipboardList, 
  CalendarDays,
  LogOut 
} from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) return null;

  const getNavItems = () => {
    switch (user.role) {
      case 'ADMIN':
        return [
          { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
          { name: 'Map', href: '/admin/map', icon: Map },
          { name: 'Clinics', href: '/admin/clinics', icon: Stethoscope },
          { name: 'Operators', href: '/admin/operators', icon: Users },
        ];
      case 'COMPANY_OPERATOR':
        return [
          { name: 'Dashboard', href: '/operator/dashboard', icon: LayoutDashboard },
          { name: 'Appts', href: '/operator/appointments', icon: ClipboardList },
        ];
      case 'CLINIC_OPERATOR':
        return [
          { name: 'Book Scan', href: '/clinic/book', icon: CalendarPlus },
          { name: 'Logout', href: '#', icon: LogOut, action: logout },
        ];
      case 'EMPLOYEE':
        return [
          { name: 'My Route', href: '/employee/route', icon: Map },
          { name: 'Logout', href: '#', icon: LogOut, action: logout },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className="md:hidden h-16 bg-white border-t border-slate-100 flex items-center justify-around fixed bottom-0 left-0 right-0 z-30 shadow-lg px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (item.action) {
          return (
            <button
              key={item.name}
              onClick={item.action}
              className="flex flex-col items-center justify-center flex-1 h-full py-1 text-slate-500 hover:text-red-500 group"
            >
              <Icon className="h-5 w-5 text-slate-400 group-hover:text-red-400 transition-colors" />
              <span className="text-[10px] font-semibold mt-1">{item.name}</span>
            </button>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-all ${
              isActive 
                ? 'text-accent font-bold scale-105' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? 'text-accent' : 'text-slate-400'}`} />
            <span className="text-[10px] font-semibold mt-1">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
