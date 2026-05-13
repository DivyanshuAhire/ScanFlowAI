'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Hospital, 
  Activity,
  Loader2,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const CreateAppointmentModal = ({ isOpen, onClose, companyId, clinicId, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [clinics, setClinics] = useState<any[]>([]);
  const [scanTypes, setScanTypes] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [formData, setFormData] = useState({
    clinicId: clinicId || '',
    appointmentDate: new Date().toISOString().split('T')[0],
    timeSlot: '',
    scanType: '',
    notes: ''
  });

  const fetchSlots = async (date: string) => {
    if (!companyId) return;
    try {
      setSlotsLoading(true);
      const url = `/api/appointments/availability?companyId=${companyId}&date=${date}${formData.clinicId ? `&clinicId=${formData.clinicId}` : ''}`;
      const res = await axios.get(url);
      setAvailableSlots(res.data);
      // Reset selected time if it's no longer available or was never set
      if (res.data.length > 0 && !res.data.find((s: any) => s.time === formData.timeSlot)?.available) {
        setFormData(prev => ({ ...prev, timeSlot: '' }));
      }
    } catch (err) {
      console.error('Failed to fetch slots', err);
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && companyId) {
      // Fetch Clinics
      axios.get(`/api/clinics?companyId=${companyId}`).then(res => setClinics(res.data));
      // Fetch Scan Types
      axios.get(`/api/company/config?companyId=${companyId}`).then(res => {
        setScanTypes(res.data.scanTypes);
        if (res.data.scanTypes.length > 0) {
          setFormData(prev => ({ ...prev, scanType: res.data.scanTypes[0] }));
        }
      });
      fetchSlots(formData.appointmentDate);
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const handleDateChange = (date: string) => {
    setFormData({ ...formData, appointmentDate: date });
    fetchSlots(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.timeSlot) {
      toast.error('Please select a time slot.');
      return;
    }
    try {
      setLoading(true);
      await axios.post('/api/appointments', { ...formData, companyId });
      toast.success('Appointment created and auto-assigned!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">New Scan Appointment</h3>
            <p className="text-xs text-slate-500 font-medium">Select a date and time for the diagnostic scan.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {!clinicId && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Select Clinic</label>
                <div className="relative">
                  <Hospital className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <select 
                    required
                    value={formData.clinicId}
                    onChange={(e) => setFormData({ ...formData, clinicId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium"
                  >
                    <option value="">Choose a clinic</option>
                    {clinics.map(c => <option key={c._id} value={c._id}>{c.name} ({c.location.area})</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Scan Type</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select 
                  required
                  value={formData.scanType}
                  onChange={(e) => setFormData({ ...formData, scanType: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium"
                >
                  <option value="">Select scan type</option>
                  {scanTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 col-span-full">
              <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                Appointment Date
                <span className="text-[10px] text-slate-400 font-medium">Auto-refreshing availability</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.appointmentDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Available Time Slots
              </label>
              {slotsLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {availableSlots.length === 0 && !slotsLoading && (
                <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-sm text-slate-500 font-medium">No slots available for this date.</p>
                </div>
              )}
              {availableSlots.map((slot: any) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setFormData({ ...formData, timeSlot: slot.time })}
                  className={cn(
                    "group relative py-2 rounded-lg text-xs font-bold border transition-all",
                    !slot.available 
                      ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                      : formData.timeSlot === slot.time
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                      : "bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-600"
                  )}
                >
                  {slot.time}
                  {slot.available && (
                    <span className={cn(
                      "absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white",
                      slot.remaining > 1 ? "bg-emerald-500" : "bg-amber-500"
                    )}></span>
                  )}
                  {/* Tooltip-like capacity info */}
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                      {slot.available ? `${slot.remaining} techs free` : 'Fully booked'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl flex gap-3 items-start border border-blue-100">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800 font-medium leading-relaxed">
              <strong>Smart Scheduling:</strong> Our AI engine monitors technician capacity in real-time. Slots with <span className="text-amber-600 font-bold">amber dots</span> have limited capacity (1 technician left).
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || slotsLoading || !formData.timeSlot}
              className="flex-[2] py-3 bg-slate-900 text-white px-8 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Assign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
