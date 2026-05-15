'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Navigation, 
  Layers, 
  Loader2,
  Check
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const CreateRouteModal = ({ isOpen, onClose, companyId, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen && companyId) {
      axios.get(`/api/clusters?companyId=${companyId}`).then(res => setClusters(res.data));
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const toggleCluster = (id: string) => {
    setSelectedClusters(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error('Session error: Company ID not found.');
      return;
    }
    if (selectedClusters.length === 0) {
      toast.error('Please select at least one cluster');
      return;
    }
    try {
      setLoading(true);
      await axios.post('/api/routes', { 
        name, 
        companyId, 
        clusterIds: selectedClusters 
      });
      toast.success('Route created successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create route');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Create Operational Route</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Route Name</label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                placeholder="e.g. North Zone Express"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Select Clusters to Include
            </label>
            <div className="grid grid-cols-2 gap-3">
              {clusters.map(cluster => (
                <button
                  key={cluster._id}
                  type="button"
                  onClick={() => toggleCluster(cluster._id)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                    selectedClusters.includes(cluster._id)
                      ? "bg-blue-50 border-blue-600 ring-1 ring-blue-600"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {selectedClusters.includes(cluster._id) && (
                      <span className="w-5 h-5 flex items-center justify-center bg-blue-100 text-blue-700 rounded-full text-[10px] font-black">
                        {selectedClusters.indexOf(cluster._id) + 1}
                      </span>
                    )}
                    <span className={cn("text-xs font-bold", selectedClusters.includes(cluster._id) ? "text-blue-700" : "text-slate-600")}>
                      {cluster.name}
                    </span>
                  </div>
                  {selectedClusters.includes(cluster._id) && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
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
              className="flex-2 py-3 bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
