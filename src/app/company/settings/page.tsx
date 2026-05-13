'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Settings, 
  Clock, 
  Calendar, 
  Save, 
  Loader2,
  Coffee,
  ShieldCheck
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({
    openingTime: '09:00',
    closingTime: '18:00',
    appointmentInterval: 30,
    travelBuffer: 15,
    holidays: ['Sunday'],
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.companyId) {
      setLoading(false);
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await axios.get(`/api/company/timings?companyId=${user.companyId}`);
        if (res.data) setConfig(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [user, authLoading]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post('/api/company/timings', { ...config, companyId: user.companyId });
      toast.success('Configuration updated successfully');
    } catch (err) {
      toast.error('Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">System Settings</h2>
            <p className="text-slate-500">Configure office hours and scheduling rules.</p>
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="max-w-4xl space-y-8">
            <div className="card-premium">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" /> Office Hours
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Opening Time</label>
                  <input 
                    type="time" 
                    value={config.openingTime}
                    onChange={(e) => setConfig({ ...config, openingTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Closing Time</label>
                  <input 
                    type="time" 
                    value={config.closingTime}
                    onChange={(e) => setConfig({ ...config, closingTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-indigo-600" /> Scheduling Rules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Appointment Interval (mins)</label>
                  <input 
                    type="number" 
                    value={config.appointmentInterval}
                    onChange={(e) => setConfig({ ...config, appointmentInterval: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Travel Buffer (mins)</label>
                  <input 
                    type="number" 
                    value={config.travelBuffer}
                    onChange={(e) => setConfig({ ...config, travelBuffer: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="card-premium">
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Weekly Holidays
              </h3>
              <div className="flex flex-wrap gap-3">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isActive = config.holidays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => {
                        const newHolidays = isActive 
                          ? config.holidays.filter((d: string) => d !== day)
                          : [...config.holidays, day];
                        setConfig({ ...config, holidays: newHolidays });
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-bold transition-all border",
                        isActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
