'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast, Toaster } from 'sonner';
import { Activity, Mail, Phone, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(15, 'Phone number too long').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine(data => data.email || data.phone, {
  message: "Please enter either your email or phone number",
  path: ["email"]
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      phone: '',
      password: ''
    }
  });

  const handleMethodChange = (method: 'email' | 'phone') => {
    setLoginMethod(method);
    reset({
      email: '',
      phone: '',
      password: ''
    });
  };

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    const loginPayload = {
      password: data.password,
      ...(loginMethod === 'email' ? { email: data.email } : { phone: data.phone })
    };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Authentication failed');
      }

      toast.success('Logged in successfully!');
      
      // Store token in localStorage (in case we need Bearer header calls later)
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('user', JSON.stringify(result.user));

      // Force page refresh and redirect based on role
      setTimeout(() => {
        router.refresh();
        router.push(callbackUrl);
      }, 800);

    } catch (error: any) {
      toast.error(error.message || 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-height-screen flex flex-col md:flex-row bg-slate-50 min-h-screen">
      <Toaster position="top-right" richColors />
      
      {/* Left side: Premium Branding Column (Hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-tr from-slate-900 via-sky-950 to-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.15),transparent_45%)]" />
        <div className="absolute top-20 left-20 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-md text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-sky-500/10 border border-sky-400/30 p-3 rounded-2xl backdrop-blur-xl">
              <Activity className="h-8 w-8 text-sky-400 animate-pulse" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-sky-100 to-sky-400 bg-clip-text text-transparent">
              ScanFlow
            </span>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight mb-4 tracking-tight">
            Intelligent Appointment Booking System
          </h1>
          <p className="text-slate-300 text-lg mb-8 leading-relaxed font-light">
            Empower dental clinics with real-time slot optimization, automated technician routing, and dynamic smart clustering.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md">
              <div className="bg-sky-500/20 p-2 rounded-lg text-sky-300">✓</div>
              <div>
                <p className="font-semibold text-white text-sm">Smart Suggestion Engine</p>
                <p className="text-xs text-slate-400">OSRM road-routing based live slot scoring</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-md">
              <div className="bg-sky-500/20 p-2 rounded-lg text-sky-300">✓</div>
              <div>
                <p className="font-semibold text-white text-sm">Automated Route Builder</p>
                <p className="text-xs text-slate-400">Directional constraints & geographical clusters</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Login Card Column */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:w-1/2">
        <div className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-100 relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
          
          {/* Logo on Mobile */}
          <div className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <Activity className="h-6 w-6 text-accent animate-pulse" />
            <span className="text-xl font-extrabold tracking-tight text-primary">ScanFlow</span>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h2>
            <p className="text-slate-500 text-sm mt-1">Please enter your details to sign in to your account</p>
          </div>

          {/* Login Method Toggle */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => handleMethodChange('email')}
              className={`py-2.5 rounded-lg transition-all duration-200 ${
                loginMethod === 'email'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Email Sign In
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange('phone')}
              className={`py-2.5 rounded-lg transition-all duration-200 ${
                loginMethod === 'phone'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-950'
              }`}
            >
              Phone Sign In
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {loginMethod === 'email' ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="name@clinic.com"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50/50 border rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all ${
                      errors.email ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-accent'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs font-medium">{errors.email.message}</p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    type="tel"
                    {...register('phone')}
                    placeholder="+91 XXXXX XXXXX"
                    className={`w-full pl-10 pr-4 py-3 bg-slate-50/50 border rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all ${
                      errors.phone ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-accent'
                    }`}
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-xs font-medium">{errors.phone.message}</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 bg-slate-50/50 border rounded-xl text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all ${
                    errors.password ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-accent'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs font-medium">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed hover:shadow-xl hover:shadow-slate-300/50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Account...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          {/* Demo Credentials Alert Panel */}
          <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/50 -mx-8 -mb-8 p-6 sm:-mx-10 sm:-mb-10 rounded-b-3xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-xs text-slate-600">
              <p className="flex justify-between">
                <span className="font-medium text-slate-700">Admin Email:</span>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-primary">admin@scanflow.com</code>
              </p>
              <p className="flex justify-between">
                <span className="font-medium text-slate-700">Password:</span>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-primary">admin123scanflow</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
