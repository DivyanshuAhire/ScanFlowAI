'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Loader2,
  Clock,
  Lock,
  Trash2,
  Truck,
  Activity
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export const EditEmployeeModal = ({ isOpen, onClose, companyId, employee, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    password: '',
    assignedRouteId: '',
    status: 'ACTIVE',
    workTimings: { start: '09:00', end: '18:00' }
  });

  useEffect(() => {
    if (isOpen && employee) {
      setFormData({
        name: employee.name || '',
        phoneNumber: employee.phoneNumber || '',
        password: '',
        assignedRouteId: employee.assignedRouteId?._id || employee.assignedRouteId || '',
        status: employee.status || 'ACTIVE',
        workTimings: employee.workTimings || { start: '09:00', end: '18:00' }
      });

      if (companyId) {
        axios.get(`/api/routes?companyId=${companyId}`).then(res => setRoutes(res.data));
      }
    }
  }, [isOpen, employee, companyId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`/api/employees/${employee._id}`, formData);
      toast.success('Employee updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this employee? Login access will be revoked.')) return;
    try {
      setDeleteLoading(true);
      await axios.delete(`/api/employees/${employee._id}`);
      toast.success('Employee deleted');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to delete employee');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 flex justify-center items-start lg:items-center">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Edit Technician</h3>
            <p className="text-xs text-slate-500 font-medium">Update profile, status, and route assignment.</p>
          </div>
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
              <label className="text-sm font-bold text-slate-700">New Password (Leave blank to keep current)</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Status</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium appearance-none"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Assigned Route</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  value={formData.assignedRouteId}
                  onChange={(e) => setFormData({ ...formData, assignedRouteId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium appearance-none"
                >
                  <option value="">Floating (Auto-Assign)</option>
                  {routes.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Start Time</label>
                <input 
                  type="time" 
                  value={formData.workTimings.start}
                  onChange={(e) => setFormData({ ...formData, workTimings: { ...formData.workTimings, start: e.target.value } })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">End Time</label>
                <input 
                  type="time" 
                  value={formData.workTimings.end}
                  onChange={(e) => setFormData({ ...formData, workTimings: { ...formData.workTimings, end: e.target.value } })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          </div>
          <div className="flex gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button"
              onClick={handleDelete}
              disabled={deleteLoading}
              className="px-4 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors flex items-center gap-2"
            >
              {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
          <div className="h-24 lg:hidden" />
        </form>
      </div>
    </div>
  );
};
