'use client';

import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, ShieldCheck, Hospital } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [type, setType] = useState<'COMPANY' | 'CLINIC'>('COMPANY');

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-2xl shadow-slate-200 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Illustration/Brand */}
        <div className="md:w-1/2 bg-blue-600 p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-4xl font-black mb-4">ScanFlow</h1>
            <p className="text-blue-100 text-lg">The enterprise-grade diagnostic operations platform.</p>
          </div>

          <div className="relative z-10">
            <div className="flex -space-x-3 mb-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-blue-600 bg-blue-400 flex items-center justify-center text-xs font-bold">
                  U{i}
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-blue-600 bg-blue-500 flex items-center justify-center text-xs font-bold">
                +1k
              </div>
            </div>
            <p className="text-sm font-medium text-blue-200">Trusted by 100+ diagnostic companies worldwide.</p>
          </div>

          {/* Decorative shapes */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute top-1/2 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-30 blur-2xl"></div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-12 lg:p-16">
          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-slate-500 font-medium">Please enter your details to sign in.</p>
          </div>

          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
              onClick={() => setType('COMPANY')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                type === 'COMPANY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShieldCheck className="w-4 h-4" /> Company
            </button>
            <button 
              onClick={() => setType('CLINIC')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                type === 'CLINIC' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Hospital className="w-4 h-4" /> Clinic
            </button>
          </div>

          <form className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email" 
                  placeholder="admin@company.com"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <a href="#" className="text-xs font-bold text-blue-600 hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200">
              Sign In <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Don't have an account? <a href="#" className="text-blue-600 font-bold hover:underline">Contact Sales</a>
          </p>
        </div>
      </div>
    </div>
  );
}
