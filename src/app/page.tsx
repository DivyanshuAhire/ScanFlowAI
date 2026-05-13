import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Hospital, Users, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <nav className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Scan<span className="text-blue-600">Flow</span></h1>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-sm font-bold text-slate-600 hover:text-slate-900">Sign In</Link>
          <Link href="/auth/login" className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all">Get Started</Link>
        </div>
      </nav>

      <main>
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-8">
            <Zap className="w-3 h-3 fill-current" /> Enterprise Diagnostic Operations
          </div>
          <h2 className="text-6xl md:text-7xl font-black text-slate-900 leading-[1.1] mb-8 tracking-tighter">
            Smart Scheduling. <br /> 
            <span className="text-blue-600">Optimized Operations.</span>
          </h2>
          <p className="max-w-2xl mx-auto text-slate-500 text-lg md:text-xl font-medium mb-12 leading-relaxed">
            ScanFlow automates appointment allocation, route optimization, and clinic management for modern diagnostic companies.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link href="/company/dashboard" className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-2">
              Company Portal <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/clinic/dashboard" className="w-full md:w-auto bg-white text-slate-900 border-2 border-slate-100 px-10 py-5 rounded-2xl font-bold text-lg hover:border-blue-200 transition-all flex items-center justify-center gap-2">
              Clinic Portal <Hospital className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <section className="bg-slate-50 py-32">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Company Admin</h4>
                <p className="text-slate-500 font-medium">Full operational control over clinics, employees, and route clusters.</p>
              </div>
              <div className="space-y-4">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600">
                  <Hospital className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Clinic Dashboard</h4>
                <p className="text-slate-500 font-medium">Simplified interface for clinics to request scans and track appointments.</p>
              </div>
              <div className="space-y-4">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-600">
                  <Users className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-slate-900">Employee App</h4>
                <p className="text-slate-500 font-medium">Mobile-first route tracking and schedule management for field staff.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400 text-sm font-medium">
        <p>© 2026 ScanFlow AI. All rights reserved.</p>
        <div className="flex gap-8">
          <a href="#" className="hover:text-slate-900">Privacy Policy</a>
          <a href="#" className="hover:text-slate-900">Terms of Service</a>
          <a href="#" className="hover:text-slate-900">Contact Support</a>
        </div>
      </footer>
    </div>
  );
}
