'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MapPin, 
  Settings, 
  Hospital,
  Truck,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';

const menuConfigs = {
  SUPER_ADMIN: [
    { name: 'Global Overview', icon: LayoutDashboard, href: '/superadmin/dashboard' },
    { name: 'Companies', icon: ShieldCheck, href: '/superadmin/companies' },
    { name: 'Global Clinics', icon: Hospital, href: '/superadmin/clinics' },
    { name: 'System Logs', icon: Truck, href: '/superadmin/logs' },
  ],
  COMPANY_ADMIN: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/company/dashboard' },
    { name: 'Appointments', icon: Calendar, href: '/company/appointments' },
    { name: 'Clinics', icon: Hospital, href: '/company/clinics' },
    { name: 'Employees', icon: Users, href: '/company/employees' },
    { name: 'Clusters', icon: MapPin, href: '/company/clusters' },
    { name: 'Routes', icon: Truck, href: '/company/routes' },
    { name: 'Settings', icon: Settings, href: '/company/settings' },
  ],
  CLINIC_USER: [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/clinic/dashboard' },
    { name: 'Appointments', icon: Calendar, href: '/clinic/appointments' },
  ],
  EMPLOYEE: [
    { name: 'My Schedule', icon: Calendar, href: '/employee/dashboard' },
  ]
};

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useUser();
  const currentMenu = menuConfigs[user?.role as keyof typeof menuConfigs] || [];

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          ScanFlow
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {currentMenu.map((item: any) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group",
                isActive 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};
