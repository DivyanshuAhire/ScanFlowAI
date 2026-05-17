'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, ShieldCheck, Hospital, Loader2, Phone, User } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUser();
  const [type, setType] = useState<'COMPANY' | 'CLINIC' | 'EMPLOYEE'>('COMPANY');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/auth/login', { identifier, password });
      
      if (res.data.requiresVerification) {
        toast.info('OTP required for verification');
        router.push(`/auth/verify?email=${encodeURIComponent(identifier)}`);
        return;
      }

      toast.success('Login successful!');
      login(res.data.user, res.data.token);
      
      const role = res.data.user.role;
      if (role === 'SUPER_ADMIN') router.push('/superadmin/dashboard');
      else if (role === 'COMPANY_ADMIN') router.push('/company/appointments');
      else if (role === 'CLINIC_USER') router.push('/clinic/dashboard');
      else if (role === 'EMPLOYEE') router.push('/employee/dashboard');
      else router.push('/');

    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-12 pb-[30vh] px-4 overflow-y-auto">
      <div className="w-full max-w-[1000px] bg-white rounded-3xl shadow-2xl shadow-slate-200 overflow-hidden flex flex-col md:flex-row my-auto">
        
        {/* Left Side: Illustration/Brand */}
        <div className="md:w-1/2 bg-blue-600 p-8 md:p-12 text-white flex flex-col justify-center md:justify-between relative overflow-hidden">
          <div className="relative z-10 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black mb-2 md:mb-4">ScanFlow</h1>
            <p className="text-blue-100 text-sm md:text-lg">The enterprise-grade diagnostic operations platform.</p>
          </div>

          <div className="relative z-10 hidden md:block">
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

          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500 rounded-full opacity-50 blur-3xl"></div>
          <div className="absolute top-1/2 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-30 blur-2xl hidden md:block"></div>
        </div>

        {/* Right Side: Form */}
        <div className="md:w-1/2 p-6 sm:p-8 md:p-12 lg:p-16">
          <div className="mb-8 md:mb-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Welcome Back</h2>
            <p className="text-sm md:text-base text-slate-500 font-medium">Please enter your details to sign in.</p>
          </div>

          <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            <button 
              onClick={() => setType('COMPANY')}
              className={cn(
                "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all",
                type === 'COMPANY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <ShieldCheck className="w-4 h-4" /> Company
            </button>
            <button 
              onClick={() => setType('CLINIC')}
              className={cn(
                "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all",
                type === 'CLINIC' ? "bg-white text-white sm:text-blue-600 text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Hospital className="w-4 h-4" /> Clinic
            </button>
            <button 
              onClick={() => setType('EMPLOYEE')}
              className={cn(
                "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-sm font-bold transition-all",
                type === 'EMPLOYEE' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              <User className="w-4 h-4" /> Employee
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">
                {type === 'EMPLOYEE' ? 'Phone Number' : 'Email Address'}
              </label>
              <div className="relative">
                {type === 'EMPLOYEE' ? (
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                ) : (
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                )}
                <input 
                  type={type === 'EMPLOYEE' ? "text" : "email"} 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    type === 'COMPANY' ? "admin@scanflow.com" : 
                    type === 'CLINIC' ? "clinic@clinic.com" : 
                    "Enter phone number"
                  }
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <button type="button" className="text-xs font-bold text-blue-600 hover:underline">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-5 h-5" /></>}
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
