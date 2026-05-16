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
import { format } from 'date-fns';

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
  const [showSlots, setShowSlots] = useState(false);

  const fetchSlots = async (date: string) => {
    if (!companyId || !formData.clinicId) return;
    try {
      setSlotsLoading(true);
      const url = `/api/appointments/availability?companyId=${companyId}&date=${date}&clinicId=${formData.clinicId}`;
      const res = await axios.get(url);
      setAvailableSlots(res.data);
      setShowSlots(true);
      // Reset selected time if it's no longer available or was never set
      if (res.data.length > 0 && !res.data.find((s: any) => s.time === formData.timeSlot)?.available) {
        setFormData(prev => ({ ...prev, timeSlot: '' }));
      }
    } catch (err) {
      console.error('Failed to fetch slots', err);
      toast.error('Failed to calculate availability.');
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
    }
  }, [isOpen, companyId]);

  useEffect(() => {
    setShowSlots(false);
    setFormData(prev => ({ ...prev, timeSlot: '' }));
  }, [formData.clinicId, formData.appointmentDate]);

  if (!isOpen) return null;

  const handleDateChange = (dateStr: string) => {
    setFormData({ ...formData, appointmentDate: dateStr });
    fetchSlots(dateStr);
  };

  const getNext7Days = () => {
    const days = [];
    let current = new Date();
    
    while (days.length < 7) {
      if (current.getDay() !== 0) { // Skip Sunday
        days.push({
          dateStr: current.toISOString().split('T')[0],
          dayName: format(current, 'EEE'),
          dayNumber: format(current, 'dd'),
          month: format(current, 'MMM')
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  const next7Days = getNext7Days();

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
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-4 flex justify-center items-start lg:items-center">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-900">New Scan Appointment</h3>
            <p className="text-xs text-slate-500 font-medium">Select a date and time for the diagnostic scan.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pb-24 lg:pb-12 space-y-8">
          <div className="space-y-8">
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

            <div className="space-y-3 col-span-full">
              <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Select Date
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Sundays excluded</span>
              </label>
              
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
                {next7Days.map((day) => (
                  <button
                    key={day.dateStr}
                    type="button"
                    onClick={() => handleDateChange(day.dateStr)}
                    className={cn(
                      "flex flex-col items-center min-w-[70px] p-3 rounded-2xl border transition-all",
                      formData.appointmentDate === day.dateStr
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100"
                        : "bg-white border-slate-100 text-slate-600 hover:border-blue-200"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase mb-1",
                      formData.appointmentDate === day.dateStr ? "text-blue-100" : "text-slate-400"
                    )}>{day.dayName}</span>
                    <span className="text-lg font-black leading-none">{day.dayNumber}</span>
                    <span className="text-[10px] font-bold mt-1">{day.month}</span>
                  </button>
                ))}
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

            {!showSlots ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-bold mb-1">Check Capacity</p>
                <p className="text-xs text-slate-500 mb-4">Calculate technician travel paths for this clinic.</p>
                <button
                  type="button"
                  disabled={!formData.clinicId || slotsLoading}
                  onClick={() => fetchSlots(formData.appointmentDate)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {slotsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3 h-3" />}
                  Show Available Slots
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
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
                        : slot.isNearby
                        ? "bg-green-100 border-green-500 text-green-700 hover:bg-green-200 hover:text-green-800"
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
                        {slot.available ? (slot.isNearby ? '1 tech is already nearby select this' : `${slot.remaining} techs free`) : (slot.reason || 'Fully booked')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>


          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-100">
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
          <div className="h-24 lg:hidden" />
        </form>
      </div>
    </div>
  );
};
