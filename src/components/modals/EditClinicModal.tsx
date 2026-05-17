'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Hospital, 
  MapPin, 
  Phone, 
  Mail,
  Loader2,
  Clock,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const DynamicMapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false, loading: () => <div className="h-[300px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">Loading Map...</div> });

export const EditClinicModal = ({ isOpen, onClose, companyId, clinic, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phoneNumber: '',
    email: '',
    lat: 19.0760,
    lng: 72.8777,
    workingHours: { open: '09:00', close: '20:00', holidays: ['Sunday'] }
  });

  useEffect(() => {
    if (isOpen && clinic) {
      setFormData({
        name: clinic.name || '',
        address: clinic.address || '',
        contactPerson: clinic.contactPerson || '',
        phoneNumber: clinic.phoneNumber || '',
        email: clinic.email || '',
        lat: clinic.lat || 19.0760,
        lng: clinic.lng || 72.8777,
        workingHours: clinic.workingHours || { open: '09:00', close: '20:00', holidays: ['Sunday'] }
      });
    }
  }, [isOpen, clinic]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`/api/clinics/${clinic._id}`, { ...formData, companyId });
      toast.success('Clinic updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update clinic');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this clinic? All associated appointments will be affected.')) return;
    try {
      setDeleteLoading(true);
      await axios.delete(`/api/clinics/${clinic._id}`);
      toast.success('Clinic deleted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to delete clinic');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm p-4 flex justify-center items-center">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-auto max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Edit Diagnostic Clinic</h3>
            <p className="text-sm text-slate-500">Location updates will regenerate auto-cluster</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8 flex-1 pb-48">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Clinic Name</label>
              <div className="relative">
                <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
              <label className="text-sm font-bold text-slate-700">Contact Person</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Clinic Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Full Address</label>
            <textarea 
              required
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex justify-between">
              <span>Map Location</span>
              <span className="text-blue-500 font-normal">
                Lat: {formData.lat.toFixed(4)}, Lng: {formData.lng.toFixed(4)}
              </span>
            </label>
            <DynamicMapPicker onLocationSelect={(lat, lng) => setFormData({...formData, lat, lng})} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Opening Time</label>
              <input 
                type="time" 
                required
                value={formData.workingHours.open}
                onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, open: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Closing Time</label>
              <input 
                type="time" 
                required
                value={formData.workingHours.close}
                onChange={(e) => setFormData({ ...formData, workingHours: { ...formData.workingHours, close: e.target.value } })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
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
