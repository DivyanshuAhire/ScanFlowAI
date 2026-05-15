'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Navigation, 
  Clock,
  Loader2,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

export const EditClusterModal = ({ isOpen, onClose, cluster, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    distanceFromHQ: 0
  });

  useEffect(() => {
    if (cluster) {
      setFormData({
        name: cluster.name || '',
        distanceFromHQ: cluster.distanceFromHQ || 0
      });
    }
  }, [cluster]);

  if (!isOpen || !cluster) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`/api/clusters/${cluster._id}`, formData);
      toast.success('Cluster updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update cluster');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this cluster?')) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/clusters/${cluster._id}`);
      toast.success('Cluster deleted successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete cluster');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Edit Cluster</h3>
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

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
              title="Delete Cluster"
            >
              {deleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
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
              disabled={loading || deleting}
              className="flex-2 py-3 bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
