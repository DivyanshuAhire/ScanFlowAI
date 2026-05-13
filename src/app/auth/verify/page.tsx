'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, ArrowRight, Loader2, Mail } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useUser();
  const email = searchParams.get('email');

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      router.push('/auth/login');
    }
  }, [email]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) {
      toast.error('Please enter the full 6-digit code');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post('/api/auth/verify-otp', { email, otp: otpString });
      toast.success('Verification successful!');
      login(res.data.user, res.data.token);
      
      // Redirect based on role
      const role = res.data.user.role;
      if (role === 'SUPER_ADMIN') router.push('/superadmin/dashboard');
      else if (role === 'COMPANY_ADMIN') router.push('/company/dashboard');
      else if (role === 'CLINIC_USER') router.push('/clinic/dashboard');
      else if (role === 'EMPLOYEE') router.push('/employee/dashboard');
      else router.push('/');
      
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-8">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-black text-slate-900 mb-2">Verify Email</h2>
        <p className="text-slate-500 font-medium mb-10 flex items-center justify-center gap-2">
          <Mail className="w-4 h-4" /> We sent a code to <span className="text-blue-600">{email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="flex justify-between gap-2">
            {otp.map((digit, i) => (
              <input
                key={i}
                id={`otp-${i}`}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                className="w-12 h-14 bg-slate-50 border border-slate-200 rounded-xl text-center text-xl font-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            ))}
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg shadow-slate-200 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify Account <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>

        <p className="mt-8 text-sm text-slate-500 font-medium">
          Didn't receive the code? <button className="text-blue-600 font-bold hover:underline">Resend OTP</button>
        </p>
      </div>
    </div>
  );
}
