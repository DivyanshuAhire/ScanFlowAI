'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  Activity, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  Clock, 
  FileText,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface ScanType {
  _id: string;
  name: string;
  durationMins: number;
  isActive: boolean;
}

export default function OperatorScanTypesPage() {
  const [scanTypes, setScanTypes] = useState<ScanType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchScanTypes() {
    try {
      const res = await fetch('/api/scantypes');
      const data = await res.json();
      setScanTypes(data.scanTypes || []);
    } catch (e) {
      console.error('Error loading scan types:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchScanTypes();
  }, []);

  const handleAddScanType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Adding new diagnostic scan service...');

    try {
      const res = await fetch('/api/scantypes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          durationMins: Number(newDuration)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create scan type');
      }

      toast.success('Diagnostic scan type configured successfully!', { id: toastId });
      
      // Reset form & reload
      setNewName('');
      setNewDuration(30);
      setShowAddModal(false);
      
      setIsLoading(true);
      await fetchScanTypes();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (typeId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const toastId = toast.loading('Toggling service status...');

    try {
      const res = await fetch(`/api/scantypes/${typeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to toggle status');
      }

      toast.success(`Service is now ${nextStatus ? 'Active' : 'Inactive'}!`, { id: toastId });
      await fetchScanTypes();
    } catch (error: any) {
      toast.error(error.message || 'Toggle failed', { id: toastId });
    }
  };

  const handleDeleteScanType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this scan type? Past appointments with this type will keep their durations.')) return;

    const toastId = toast.loading('Erasuring service record...');
    try {
      const res = await fetch(`/api/scantypes/${typeId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete scan type');
      }

      toast.success('Diagnostic service record deleted successfully!', { id: toastId });
      setIsLoading(true);
      await fetchScanTypes();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed', { id: toastId });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7 text-accent animate-pulse" /> Diagnostic Scan Services
          </h1>
          <p className="text-slate-500 text-sm mt-1">Configure diagnostic dental scan types, set benchmark operating durations, and toggle active catalog items.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Scan Service
        </button>
      </div>

      {/* Grid view of scan types */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Retrieving Catalog...</span>
        </div>
      ) : scanTypes.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Activity className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">No Scan Types Setup</h3>
            <p className="text-slate-400 text-xs mt-1">Add diagnostic scan services to populate the booking wizard selectors.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {scanTypes.map((type) => (
            <div 
              key={type._id} 
              className={`bg-white border border-slate-100 rounded-3xl p-6.5 shadow-sm space-y-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                !type.isActive ? 'opacity-70 bg-slate-50/50' : ''
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="bg-sky-50 text-sky-500 p-3 rounded-2xl shrink-0">
                    <Activity className="h-5 w-5" />
                  </div>
                  
                  <button
                    onClick={() => handleToggleStatus(type._id, type.isActive)}
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide cursor-pointer transition-all border ${
                      type.isActive 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50'
                    }`}
                  >
                    {type.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-extrabold text-slate-900 tracking-tight">{type.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold font-mono">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Duration: ~{type.durationMins} Mins</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 pt-4.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Catalog Item</span>
                <button
                  onClick={() => handleDeleteScanType(type._id)}
                  className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                  title="Delete Service"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* Add Scan Type Modal Dialog */}
      {/* -------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 border border-slate-100 shadow-2xl space-y-6 animate-scale-up">
            
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add Scan Service</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddScanType} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Name</label>
                <div className="relative">
                  <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. 3D CBCT Panoramic Scan" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Benchmark Duration (Minutes)</label>
                <div className="relative">
                  <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="number" 
                    required 
                    min={5}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    placeholder="e.g. 45" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center"
                >
                  {isSubmitting ? 'Creating...' : 'Save Scan Service'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
