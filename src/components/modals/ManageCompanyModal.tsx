'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Key, 
  Shield, 
  Mail, 
  Phone, 
  User,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const ManageCompanyModal = ({ isOpen, onClose, company }: any) => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'reset'>('list');
  const [selectedAdmin, setSelectedAdmin] = useState<any>(null);

  // New Admin Form
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: ''
  });

  // Reset Password Form
  const [newPassword, setNewPassword] = useState('');

  const fetchAdmins = async () => {
    if (!company?._id) return;
    try {
      setFetchLoading(true);
      const res = await axios.get(`/api/superadmin/companies/${company._id}/admins`);
      setAdmins(res.data);
    } catch (err) {
      toast.error('Failed to fetch admins');
    } finally {
      setFetchLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && company) {
      fetchAdmins();
      setActiveTab('list');
    }
  }, [isOpen, company]);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(`/api/superadmin/companies/${company._id}/admins`, newAdmin);
      toast.success('Admin added successfully');
      fetchAdmins();
      setActiveTab('list');
      setNewAdmin({ name: '', email: '', password: '', phoneNumber: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add admin');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    try {
      setLoading(true);
      await axios.post(`/api/superadmin/companies/${company._id}/reset-password`, {
        userId: selectedAdmin._id,
        newPassword
      });
      toast.success('Password reset successfully');
      setActiveTab('list');
      setNewPassword('');
      setSelectedAdmin(null);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Manage {company?.name}</h3>
            <p className="text-xs text-slate-500 font-medium">Administrator management and security control.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('list')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-all border-b-2",
              activeTab === 'list' ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Admins List
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={cn(
              "flex-1 py-4 text-sm font-bold transition-all border-b-2",
              activeTab === 'add' ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            Add New Admin
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-4">
              {fetchLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-medium">
                  No additional admins found.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {admins.map((admin) => (
                    <div key={admin._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{admin.name}</p>
                          <p className="text-xs text-slate-500">{admin.email}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setActiveTab('reset');
                        }}
                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <Key className="w-4 h-4" /> Reset Pass
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleAddAdmin} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      placeholder="Admin Name"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      required
                      type="text" 
                      placeholder="+91..."
                      value={newAdmin.phoneNumber}
                      onChange={(e) => setNewAdmin({ ...newAdmin, phoneNumber: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="email" 
                    placeholder="admin@company.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="password" 
                    placeholder="Minimum 8 characters"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200 mt-4 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Create Company Admin</>}
              </button>
            </form>
          )}

          {activeTab === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 border border-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  You are resetting the password for <strong>{selectedAdmin?.name}</strong> ({selectedAdmin?.email}). This action cannot be undone.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="password" 
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-4 h-4" /> Confirm Password Reset</>}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
