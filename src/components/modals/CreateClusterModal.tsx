'use client';

import React, { useState } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Clock,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export const CreateClusterModal = ({ isOpen, onClose, companyId, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    distanceFromHQ: 0,
    location: { lat: 19.0760, lng: 72.8777 }
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Session error: Company ID not found. Please re-login.');
      return;
    }
    try {
      setLoading(true);
      await axios.post('/api/clusters', { ...formData, companyId });
      toast.success('Cluster created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create cluster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Define New Cluster</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Cluster Name</label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                placeholder="e.g. South Mumbai"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Dist. from HQ (km)</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="number" 
                required
                value={formData.distanceFromHQ}
                onChange={(e) => setFormData({ ...formData, distanceFromHQ: parseFloat(e.target.value) })}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl flex gap-3 items-start border border-amber-100">
            <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
              Note: Geospatial coordinates are currently auto-generated based on HQ reference. Manual map pinning will be available in the next update.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-2 py-3 bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Cluster'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
