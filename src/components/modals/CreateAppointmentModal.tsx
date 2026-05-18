'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  Hospital, 
  Activity,
  Loader2,
  AlertCircle,
  MapPin
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

  // Clinic autosuggest states & memos
  const [clinicSearch, setClinicSearch] = useState('');
  const [showAutosuggest, setShowAutosuggest] = useState(false);

  const filteredClinics = useMemo(() => {
    const q = clinicSearch.toLowerCase();
    return clinics.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.location?.area || '').toLowerCase().includes(q)
    );
  }, [clinics, clinicSearch]);

  const selectedClinic = useMemo(() => {
    return clinics.find(c => c._id === formData.clinicId);
  }, [clinics, formData.clinicId]);

  // Sync clinic search text on selected clinic change
  useEffect(() => {
    if (formData.clinicId && clinics.length > 0) {
      const selected = clinics.find(c => c._id === formData.clinicId);
      if (selected) {
        setClinicSearch(`${selected.name} (${selected.location?.area || ''})`);
      }
    } else if (!formData.clinicId) {
      setClinicSearch('');
    }
  }, [formData.clinicId, clinics]);

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
      toast.success('Appointment created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200 mt-12 mb-[30vh] text-left">
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
                  <input
                    type="text"
                    required
                    value={clinicSearch}
                    placeholder="Search & select clinic..."
                    onFocus={() => {
                      setShowAutosuggest(true);
                      setClinicSearch('');
                    }}
                    onChange={(e) => {
                      setClinicSearch(e.target.value);
                      setShowAutosuggest(true);
                    }}
                    onBlur={() => {
                      // Small timeout to let clicks on option elements register
                      setTimeout(() => setShowAutosuggest(false), 200);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none font-medium text-slate-800 placeholder-slate-400 transition-all"
                  />
                  {showAutosuggest && (
                    <div className="absolute left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl z-[150] divide-y divide-slate-50">
                      {filteredClinics.length === 0 ? (
                        <div className="p-4 text-xs font-medium text-slate-400 italic text-center">
                          No clinics match "{clinicSearch}"
                        </div>
                      ) : (
                        filteredClinics.map((c: any) => (
                          <div
                            key={c._id}
                            onClick={() => {
                              setFormData({ ...formData, clinicId: c._id });
                              setClinicSearch(`${c.name} (${c.location?.area || ''})`);
                              setShowAutosuggest(false);
                            }}
                            className={cn(
                              "p-3 text-sm cursor-pointer hover:bg-slate-50 transition-colors flex flex-col gap-0.5 text-left",
                              formData.clinicId === c._id ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-700"
                            )}
                          >
                            <span className="font-bold text-slate-900 text-sm">{c.name}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" /> {c.location?.area || 'No location'}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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
                <Clock className="w-4 h-4 text-slate-400" /> Smart Route Slots
              </label>
              {slotsLoading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
            </div>

            {!showSlots ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-bold mb-1">Check Route Continuity</p>
                <p className="text-xs text-slate-500 mb-4">Suggest slot times based on active route flow and sequence.</p>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {availableSlots.length === 0 && !slotsLoading && (
                  <div className="col-span-full p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 font-medium">No slots available for this date.</p>
                  </div>
                )}
                {availableSlots.map((slot: any) => {
                  const isSelected = formData.timeSlot === slot.time;
                  let slotStyle = "bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:text-slate-900";
                  
                  if (isSelected) {
                    if (slot.type === 'preferred') {
                      slotStyle = "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-100";
                    } else {
                      slotStyle = "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-100";
                    }
                  } else {
                    if (slot.type === 'preferred') {
                      slotStyle = "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300";
                    } else {
                      slotStyle = "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800";
                    }
                  }

                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setFormData({ ...formData, timeSlot: slot.time })}
                      className={cn(
                        "group relative py-3 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center justify-center min-h-[50px] cursor-pointer",
                        slotStyle
                      )}
                    >
                      <span className="text-sm font-black">{slot.time}</span>
                      {slot.type === 'preferred' && (
                        <span className="text-[8px] font-extrabold uppercase mt-0.5 tracking-wider">
                          Best Slot ⭐
                        </span>
                      )}
                      
                      {/* Tooltip containing explanation */}
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-[200] pointer-events-none">
                        <div className="bg-slate-900/95 backdrop-blur text-white text-[10px] px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl border border-slate-800 font-medium">
                          {slot.explanation || 'Route sequence aligned.'}
                        </div>
                      </div>
                    </button>
                  );
                })}
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
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Booking'}
            </button>
          </div>
          <div className="h-24 lg:hidden" />
        </form>
      </div>
      </div>
    </div>
  );
};
