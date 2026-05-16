'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Loader2,
  Clock,
  Navigation,
  Lock
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export const CreateEmployeeModal = ({ isOpen, onClose, companyId, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    phoneNumber: '',
    workTimings: { start: '09:00', end: '18:00' }
  });


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Session error: Company ID not found.');
      return;
    }
    try {
      setLoading(true);
      // Create employee
      const empRes = await axios.post('/api/employees', { ...formData, companyId });
      
      // Also create a User account for the employee for login
      await axios.post('/api/auth/register', {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        role: 'EMPLOYEE',
        companyId: companyId,
        employeeId: empRes.data._id
      });

      toast.success('Employee and Login Account created');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 flex justify-center items-start lg:items-center">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Add Field Technician</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pb-24 lg:pb-12 space-y-8">
          <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="tel" 
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Login Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Start Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="time" 
                  required
                  value={formData.workTimings.start}
                  onChange={(e) => setFormData({ ...formData, workTimings: { ...formData.workTimings, start: e.target.value } })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">End Time</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="time" 
                  required
                  value={formData.workTimings.end}
                  onChange={(e) => setFormData({ ...formData, workTimings: { ...formData.workTimings, end: e.target.value } })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl flex gap-3 items-start border border-blue-100 mt-4">
            <Navigation className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              <strong>Smart Routing Enabled:</strong> Optimal routes will be automatically assigned to this technician by the ScanFlow AI engine based on appointment density and geospatial clusters.
            </p>
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
              className="flex-[2] py-3 bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add Technician'}
            </button>
          </div>
          <div className="h-24 lg:hidden" />
        </form>
      </div>
    </div>
  );
};
