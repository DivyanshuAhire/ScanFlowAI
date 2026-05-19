'use client';

import React from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import TopNav from './TopNav';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { Loader2 } from 'lucide-react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Loading ScanFlow...</span>
      </div>
    );
  }

  // If user is not authenticated, let the page render without shell (e.g. login page)
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Bar Navigation */}
      <TopNav />

      {/* Main Screen Layout */}
      <div className="flex flex-1 relative">
        {/* Left Hand Sidebar (Desktop Only) */}
        <Sidebar />

        {/* Content View Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8 max-w-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom Bar Navigation (Mobile Only) */}
      <BottomNav />
    </div>
  );
}
