"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Hospital, 
  Route, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null;

  const navItems = [
    { icon: <LayoutDashboard />, label: "Overview", href: "/dashboard", roles: ["ADMIN", "EMPLOYEE"] },
    { icon: <Calendar />, label: "Calendar", href: "/dashboard/calendar", roles: ["ADMIN"] },
    { icon: <Hospital />, label: "Clinics", href: "/dashboard/clinics", roles: ["ADMIN"] },
    { icon: <Users />, label: "Employees", href: "/dashboard/employees", roles: ["ADMIN"] },
    { icon: <Route />, label: "Routes", href: "/dashboard/routes", roles: ["ADMIN", "EMPLOYEE"] },
    { icon: <Settings />, label: "Settings", href: "/dashboard/settings", roles: ["ADMIN", "EMPLOYEE"] },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">S</span>
            </div>
            <span className="text-xl font-bold">ScanFlow AI</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.filter(item => item.roles.includes(user.role)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
                pathname === item.href 
                  ? "bg-primary/10 text-primary" 
                  : "text-zinc-500 hover:text-white hover:bg-zinc-900"
              )}
            >
              <span className={cn(
                "w-5 h-5",
                pathname === item.href ? "text-primary" : "text-zinc-500 group-hover:text-white"
              )}>
                {item.icon}
              </span>
              <span className="font-medium text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={() => { logout(); router.push("/login"); }}
            className="flex items-center gap-3 px-4 py-3 w-full text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/50 backdrop-blur-md">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search appointments, clinics..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-400 hover:text-white relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-[#0a0a0a]"></span>
            </button>
            <div className="h-8 w-px bg-zinc-800 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{user.role.toLowerCase()}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-400 p-0.5">
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-sm">
                  {user.name.charAt(0)}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
