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
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';

const menuConfigs = {
  SUPER_ADMIN: [
    { name: 'Global Overview', icon: LayoutDashboard, href: '/superadmin/dashboard' },
    { name: 'Companies', icon: ShieldCheck, href: '/superadmin/companies' },
    { name: 'Spatial Optimization', icon: MapPin, href: '/superadmin/clusters' },
    { name: 'System Logs', icon: Truck, href: '/superadmin/logs' },
  ],
  COMPANY_ADMIN: [
    { name: 'Appointments', icon: Calendar, href: '/company/appointments' },
    { name: 'Dashboard', icon: LayoutDashboard, href: '/company/dashboard' },
    { name: 'Spatial Optimization', icon: MapPin, href: '/company/clusters' },
    { name: 'Clinics', icon: Hospital, href: '/company/clinics' },
    { name: 'Employees', icon: Users, href: '/company/employees' },
    { name: 'Settings', icon: Settings, href: '/company/settings' },
  ],
  CLINIC_USER: [
    { name: 'Appointments', icon: Calendar, href: '/clinic/appointments' },
    { name: 'Dashboard', icon: LayoutDashboard, href: '/clinic/dashboard' },
  ],
  EMPLOYEE: [
    { name: 'My Schedule', icon: Calendar, href: '/employee/dashboard' },
  ]
};

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useUser();
  const [isOpen, setIsOpen] = React.useState(false);
  const currentMenu = menuConfigs[user?.role as keyof typeof menuConfigs] || [];

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg lg:hidden shadow-lg"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={cn(
        "w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            ScanFlow
          </h1>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-slate-800 rounded-lg lg:hidden"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {currentMenu.map((item: any) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
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
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors group"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Logout</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};
