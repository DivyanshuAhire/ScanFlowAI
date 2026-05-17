'use client';

import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Mail, 
  Lock,
  Loader2,
  ShieldCheck,
  Phone,
  MapPin
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const DynamicMapPicker = dynamic(() => import('@/components/MapPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full flex items-center justify-center bg-slate-100 rounded-2xl border border-slate-200 animate-pulse">
      <span className="text-slate-400 font-bold text-sm">Loading Map Picker...</span>
    </div>
  )
});

export const CreateCompanyModal = ({ isOpen, onClose, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    subscriptionPlan: 'PREMIUM',
    lat: 19.0760,
    lng: 72.8777
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // 1. Create Company
      const companyRes = await axios.post('/api/companies', {
        name: formData.companyName,
        email: formData.companyEmail,
        phoneNumber: formData.companyPhone,
        address: formData.companyAddress,
        subscriptionPlan: formData.subscriptionPlan,
        hqLocation: {
          lat: formData.lat,
          lng: formData.lng
        }
      });

      // 2. Create Admin User
      await axios.post('/api/auth/register', {
        name: formData.adminName,
        email: formData.adminEmail,
        password: formData.adminPassword,
        role: 'COMPANY_ADMIN',
        companyId: companyRes.data._id
      });

      toast.success('Company, HQ Location, and Admin account created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to register company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Onboard New Partner</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" /> Company Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                required
                placeholder="Company Name"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="input-premium"
              />
              <input 
                type="email" 
                required
                placeholder="Official Email"
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                className="input-premium"
              />
              <input 
                type="tel" 
                placeholder="Phone Number"
                value={formData.companyPhone}
                onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                className="input-premium"
              />
              <select 
                value={formData.subscriptionPlan}
                onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                className="input-premium appearance-none"
              >
                <option value="BASIC">Basic Plan</option>
                <option value="PREMIUM">Premium Plan</option>
                <option value="ENTERPRISE">Enterprise Plan</option>
              </select>
            </div>
            <textarea 
              placeholder="Full Address"
              value={formData.companyAddress}
              onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
              className="input-premium min-h-[80px] resize-none"
            />
            
            <div className="space-y-2 pt-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5" /> HQ Location (Search & Drop Pin)
              </label>
              <DynamicMapPicker onLocationSelect={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))} />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Master Admin Account
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                required
                placeholder="Admin Full Name"
                value={formData.adminName}
                onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                className="input-premium"
              />
              <input 
                type="email" 
                required
                placeholder="Admin Login Email"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                className="input-premium"
              />
              <input 
                type="password" 
                required
                placeholder="Initial Password"
                value={formData.adminPassword}
                onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                className="input-premium col-span-full"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="flex-2 py-3 bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-200"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register & Onboard Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
