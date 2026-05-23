'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  Clock, 
  Building, 
  User, 
  Loader2,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Search,
  ChevronDown,
  Activity,
  Check
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface Clinic {
  _id: string;
  name: string;
  phone: string;
  address?: string;
}

interface ScanType {
  _id: string;
  name: string;
  durationMins: number;
}

interface SlotSuggestion {
  slot: string;
  status: 'BEST' | 'AVAILABLE' | 'TAKEN';
  reason: string;
  suggestedEmployeeId: string | null;
  suggestedEmployeeName: string | null;
  score: number;
}

export default function BookingWizard({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [scanTypes, setScanTypes] = useState<ScanType[]>([]);
  
  const [selectedClinicId, setSelectedClinicId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [selectedScanTypeId, setSelectedScanTypeId] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [notes, setNotes] = useState('');

  // Dropdown states
  const [clinicSearch, setClinicSearch] = useState('');
  const [scanTypeSearch, setScanTypeSearch] = useState('');
  const [isClinicOpen, setIsClinicOpen] = useState(false);
  const [isScanTypeOpen, setIsScanTypeOpen] = useState(false);

  // Suggestions states
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 10 booking days
  const availableDates = Array.from({ length: 10 }, (_, i) => addDays(new Date(), i + 1));

  useEffect(() => {
    async function initBooking() {
      try {
        const [clinicsRes, scanTypesRes] = await Promise.all([
          fetch('/api/clinics'),
          fetch('/api/scantypes')
        ]);

        const clinicsData = await clinicsRes.json();
        const scanTypesData = await scanTypesRes.json();

        const loadedClinics = clinicsData.clinics || [];
        setClinics(loadedClinics);
        
        const loadedScanTypes = (scanTypesData.scanTypes || []).filter((s: any) => s.isActive);
        setScanTypes(loadedScanTypes);

        if (loadedScanTypes.length > 0) {
          setSelectedScanTypeId(loadedScanTypes[0]._id);
        }

        if (user?.role === 'CLINIC_OPERATOR' && user.clinicId) {
          setSelectedClinicId(user.clinicId);
        } else if (loadedClinics.length > 0) {
          setSelectedClinicId(loadedClinics[0]._id);
        }
      } catch (e) {
        console.error('Booking initialization failed:', e);
        toast.error('Failed to load clinic list or scan types');
      } finally {
        setIsLoading(false);
      }
    }
    initBooking();
  }, [user]);

  useEffect(() => {
    if (!selectedClinicId || !selectedDate) return;

    async function loadSlots() {
      setLoadingSlots(true);
      try {
        const res = await fetch('/api/slots/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: selectedClinicId, date: selectedDate })
        });
        const data = await res.json();
        if (res.ok) {
          const fetchedSuggestions = data.suggestions || [];
          setSuggestions(fetchedSuggestions);
          
          const bestSlot = fetchedSuggestions.find((s: any) => s.status === 'BEST');
          const availableSlot = fetchedSuggestions.find((s: any) => s.status === 'AVAILABLE');
          
          if (bestSlot) {
            setSelectedSlot(bestSlot.slot);
          } else if (availableSlot) {
            setSelectedSlot(availableSlot.slot);
          } else {
            setSelectedSlot('');
          }
        }
      } catch (err) {
        console.error('Error fetching slot suggestions:', err);
      } finally {
        setLoadingSlots(false);
      }
    }

    loadSlots();
  }, [selectedClinicId, selectedDate]);

  const handleConfirmBooking = async () => {
    if (!selectedClinicId || !selectedScanTypeId || !selectedDate || !selectedSlot) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Confirming scan appointment booking...');

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId: selectedClinicId,
          date: selectedDate,
          slotTime: selectedSlot,
          scanTypeId: selectedScanTypeId,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save booking');

      toast.success('Appointment booked successfully! Spatial routing updated.', { id: toastId });
      
      if (onSuccess) {
        onSuccess();
      } else {
        if (user?.role === 'CLINIC_OPERATOR') {
          setSelectedSlot('');
          setNotes('');
          const currentClinic = selectedClinicId;
          setSelectedClinicId('');
          setTimeout(() => setSelectedClinicId(currentClinic), 50);
        } else {
          router.push('/operator/appointments');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Error booking appointment', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 text-sky-500 animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Initializing Booking...</span>
      </div>
    );
  }

  const selectedClinic = clinics.find(c => c._id === selectedClinicId);
  const selectedScanType = scanTypes.find(s => s._id === selectedScanTypeId);
  const selectedSlotDetails = suggestions.find(s => s.slot === selectedSlot);

  const bestSlots = suggestions.filter(s => s.status === 'BEST').sort((a, b) => b.score - a.score);
  const availableSlots = suggestions.filter(s => s.status === 'AVAILABLE');
  const takenSlots = suggestions.filter(s => s.status === 'TAKEN');

  const filteredClinics = clinics.filter(c => c.name.toLowerCase().includes(clinicSearch.toLowerCase()));
  const filteredScanTypes = scanTypes.filter(s => s.name.toLowerCase().includes(scanTypeSearch.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Form Details */}
        <div className="space-y-6">
          
          {/* Clinic Dropdown */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" /> Select Clinic
            </label>
            
            {user?.role === 'CLINIC_OPERATOR' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700">
                {selectedClinic?.name}
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsClinicOpen(!isClinicOpen)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-left hover:border-sky-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                >
                  <span className="text-sm font-bold text-slate-700 line-clamp-1">
                    {selectedClinic?.name || 'Search and select clinic...'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>

                {isClinicOpen && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-50">
                      <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400 mr-2" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Search clinic..."
                          value={clinicSearch}
                          onChange={(e) => setClinicSearch(e.target.value)}
                          className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-800"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredClinics.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No clinics found.</div>
                      ) : (
                        filteredClinics.map(c => (
                          <button
                            key={c._id}
                            onClick={() => {
                              setSelectedClinicId(c._id);
                              setIsClinicOpen(false);
                              setClinicSearch('');
                            }}
                            className={`w-full text-left px-4 py-2.5 hover:bg-sky-50 flex items-center justify-between transition-colors ${selectedClinicId === c._id ? 'bg-sky-50/50' : ''}`}
                          >
                            <div>
                              <div className={`text-sm font-semibold ${selectedClinicId === c._id ? 'text-sky-700' : 'text-slate-700'}`}>{c.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{c.address || 'No address'}</div>
                            </div>
                            {selectedClinicId === c._id && <Check className="h-4 w-4 text-sky-500" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {isClinicOpen && (
                  <div className="fixed inset-0 z-10" onClick={() => setIsClinicOpen(false)} />
                )}
              </div>
            )}
          </div>

          {/* Scan Type Dropdown */}
          <div className="space-y-2 relative">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Scan Service
            </label>
            
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsScanTypeOpen(!isScanTypeOpen)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center justify-between text-left hover:border-sky-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <span className="text-sm font-bold text-slate-700 line-clamp-1">
                  {selectedScanType ? `${selectedScanType.name} (~${selectedScanType.durationMins}m)` : 'Select scan type...'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isScanTypeOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-50">
                    <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2">
                      <Search className="h-4 w-4 text-slate-400 mr-2" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search scan service..."
                        value={scanTypeSearch}
                        onChange={(e) => setScanTypeSearch(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-800"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredScanTypes.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No scan types found.</div>
                    ) : (
                      filteredScanTypes.map(s => (
                        <button
                          key={s._id}
                          onClick={() => {
                            setSelectedScanTypeId(s._id);
                            setIsScanTypeOpen(false);
                            setScanTypeSearch('');
                          }}
                          className={`w-full text-left px-4 py-2.5 hover:bg-sky-50 flex items-center justify-between transition-colors ${selectedScanTypeId === s._id ? 'bg-sky-50/50' : ''}`}
                        >
                          <div>
                            <div className={`text-sm font-semibold ${selectedScanTypeId === s._id ? 'text-sky-700' : 'text-slate-700'}`}>{s.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">~{s.durationMins} mins</div>
                          </div>
                          {selectedScanTypeId === s._id && <Check className="h-4 w-4 text-sky-500" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
              {isScanTypeOpen && (
                <div className="fixed inset-0 z-10" onClick={() => setIsScanTypeOpen(false)} />
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Booking Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                max={format(addDays(new Date(), 10), 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:border-sky-300 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <p className="text-[10px] text-slate-400">Please schedule 24hrs in advance.</p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Instructions</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for the technician..."
              rows={2}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 text-slate-800 resize-none transition-all"
            />
          </div>

        </div>

        {/* Right Column: Slot Selection & Summary */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm min-h-[300px] flex flex-col">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-500" /> Available Slots
            </h3>

            {loadingSlots ? (
              <div className="flex-1 flex flex-col justify-center items-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 text-sky-500 animate-spin" />
                <span className="text-xs font-medium">Computing routes...</span>
              </div>
            ) : !selectedClinicId ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic text-center">
                Select a clinic to view optimized slots.
              </div>
            ) : (
              <div className="space-y-5 overflow-y-auto pr-2 flex-1">
                {bestSlots.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-1 rounded uppercase tracking-wider block w-fit">
                      ✨ Route Optimized
                    </span>
                    <div className="space-y-2">
                      {bestSlots.map((s) => (
                        <button
                          key={s.slot}
                          onClick={() => setSelectedSlot(s.slot)}
                          className={`w-full p-3 border rounded-xl flex items-center justify-between text-left transition-all ${
                            selectedSlot === s.slot 
                              ? 'bg-sky-500 border-sky-500 text-white shadow-md shadow-sky-500/20' 
                              : 'bg-white border-sky-200 text-slate-700 hover:bg-sky-50 hover:border-sky-300'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-sm font-mono block">{s.slot}</span>
                            <span className={`text-[10px] mt-0.5 block ${selectedSlot === s.slot ? 'text-sky-100' : 'text-slate-500'}`}>
                              {s.reason}
                            </span>
                          </div>
                          {selectedSlot === s.slot && <Check className="h-4 w-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {availableSlots.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Openings</span>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((s) => (
                        <button
                          key={s.slot}
                          onClick={() => setSelectedSlot(s.slot)}
                          className={`py-2 px-1 border rounded-lg text-center font-bold font-mono transition-all text-xs ${
                            selectedSlot === s.slot 
                              ? 'bg-sky-500 border-sky-500 text-white shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {s.slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {takenSlots.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unavailable</span>
                    <div className="grid grid-cols-4 gap-2">
                      {takenSlots.map((s) => (
                        <div
                          key={s.slot}
                          className="py-1.5 px-1 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg text-center font-mono text-[10px] cursor-not-allowed opacity-60"
                          title={s.reason}
                        >
                          {s.slot}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md space-y-5">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Clinic</span>
                <span className="font-bold line-clamp-1 text-right max-w-[60%]">{selectedClinic?.name || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Service</span>
                <span className="font-bold">{selectedScanType?.name || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Time</span>
                <span className="font-mono font-bold text-sky-400">
                  {selectedSlot ? `${selectedSlot} @ ` : ''}{selectedDate}
                </span>
              </div>
            </div>

            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting || !selectedClinicId || !selectedScanTypeId || !selectedDate || !selectedSlot}
              className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-600 disabled:bg-slate-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isSubmitting ? (
                <><Loader2 className="h-4.5 w-4.5 animate-spin" /> Confirming...</>
              ) : (
                <>Confirm Booking <ChevronRight className="h-4.5 w-4.5" /></>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
