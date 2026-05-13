'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Settings as SettingsIcon, 
  Plus, 
  Trash2, 
  Activity,
  Save,
  Loader2,
  CheckCircle
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';

export default function CompanySettings() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [scanTypes, setScanTypes] = useState<string[]>([]);
  const [newType, setNewType] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'COMPANY_ADMIN') {
      router.push('/auth/login');
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await axios.get(`/api/company/config?companyId=${user.companyId}`);
        setScanTypes(res.data.scanTypes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [user, authLoading]);

  const handleAdd = () => {
    if (!newType.trim()) return;
    if (scanTypes.includes(newType.trim())) {
      toast.error('Type already exists');
      return;
    }
    setScanTypes([...scanTypes, newType.trim()]);
    setNewType('');
  };

  const handleRemove = (type: string) => {
    setScanTypes(scanTypes.filter(t => t !== type));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post('/api/company/config', {
        companyId: user.companyId,
        scanTypes
      });
      toast.success('Configuration saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Company Settings</h2>
            <p className="text-slate-500 font-medium">Configure global diagnostic parameters.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </header>

        <div className="max-w-2xl space-y-8">
          <section className="card-premium">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Diagnostic Scan Types</h3>
            </div>

            <p className="text-sm text-slate-500 mb-6">
              Manage the types of scans your clinics can request. These will appear as options in the appointment booking form.
            </p>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="e.g. Bone Density Scan"
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button 
                  onClick={handleAdd}
                  className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {scanTypes.map((type) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group hover:border-blue-200 transition-all">
                    <span className="font-bold text-slate-700 text-sm flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      {type}
                    </span>
                    <button 
                      onClick={() => handleRemove(type)}
                      className="p-1.5 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="card-premium opacity-50 pointer-events-none">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Advanced Optimization</h3>
            <p className="text-sm text-slate-500">Coming soon: Configure AI routing priorities and buffer times.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
