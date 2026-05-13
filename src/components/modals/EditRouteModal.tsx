'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Navigation, 
  Layers, 
  Loader2,
  Check,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const EditRouteModal = ({ isOpen, onClose, companyId, route, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    if (isOpen && companyId && route) {
      setName(route.name);
      // Fetch all clusters for the company
      axios.get(`/api/clusters?companyId=${companyId}`).then(res => {
        setClusters(res.data);
        // Pre-select clusters that belong to this route
        const routeClusters = res.data
          .filter((c: any) => (c.routeGroupIds || []).some((rg: any) => (rg._id || rg) === route._id))
          .map((c: any) => c._id);
        setSelectedClusters(routeClusters);
      });
    }
  }, [isOpen, companyId, route]);

  if (!isOpen) return null;

  const toggleCluster = (id: string) => {
    setSelectedClusters(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !route) return;
    
    try {
      setLoading(true);
      await axios.put(`/api/routes/${route._id}`, { 
        name, 
        clusterIds: selectedClusters 
      });
      toast.success('Route updated successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update route');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this route? Clusters will be unassigned.')) return;
    try {
      setDeleteLoading(true);
      await axios.delete(`/api/routes/${route._id}`);
      toast.success('Route deleted');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to delete route');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Edit Route</h3>
            <p className="text-xs text-slate-500 font-medium">Update path name and cluster membership.</p>
          </div>
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
              <Layers className="w-4 h-4 text-blue-600" /> Adjust Clusters
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2">
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
                  <span className={cn("text-xs font-bold", selectedClusters.includes(cluster._id) ? "text-blue-700" : "text-slate-600")}>
                    {cluster.name}
                  </span>
                  {selectedClusters.includes(cluster._id) && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
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
              className="flex-[2] py-3 bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-100"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
