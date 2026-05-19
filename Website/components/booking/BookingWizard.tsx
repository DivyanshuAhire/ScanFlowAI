'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  Clock, 
  Activity, 
  Building, 
  User, 
  CheckCircle2, 
  Loader2,
  FileText,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  ChevronRight
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

export default function BookingWizard() {
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

  // Suggestions states
  const [suggestions, setSuggestions] = useState<SlotSuggestion[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate next 10 booking days (excluding today per 24hr EOD constraint)
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
        
        // Active scan types
        const loadedScanTypes = (scanTypesData.scanTypes || []).filter((s: any) => s.isActive);
        setScanTypes(loadedScanTypes);

        // Pre-select first scan type for convenience
        if (loadedScanTypes.length > 0) {
          setSelectedScanTypeId(loadedScanTypes[0]._id);
        }

        // If clinic operator, auto-select their clinic
        if (user?.role === 'CLINIC_OPERATOR' && user.clinicId) {
          setSelectedClinicId(user.clinicId);
        } else if (loadedClinics.length > 0) {
          // Pre-select first clinic for admins/operators
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

  // Fetch slot suggestions when selectedClinicId or selectedDate changes
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
          
          // Auto-select the BEST slot if available to minimize clicks!
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
    if (!selectedClinicId) {
      toast.error('Please select a clinic');
      return;
    }
    if (!selectedScanTypeId) {
      toast.error('Please select a scan type');
      return;
    }
    if (!selectedDate) {
      toast.error('Please select a booking date');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a preferred slot');
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

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save booking');
      }

      toast.success('Appointment booked successfully! Spatial routing updated.', { id: toastId });
      
      // Redirect or reset
      if (user?.role === 'CLINIC_OPERATOR') {
        setSelectedSlot('');
        setNotes('');
        // Refresh slots suggestions
        const currentClinic = selectedClinicId;
        setSelectedClinicId('');
        setTimeout(() => setSelectedClinicId(currentClinic), 50);
      } else {
        router.push('/operator/appointments');
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
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
        <span className="text-sm font-semibold text-slate-500">Initializing ScanFlow Smart Booking...</span>
      </div>
    );
  }

  const selectedClinic = clinics.find(c => c._id === selectedClinicId);
  const selectedScanType = scanTypes.find(s => s._id === selectedScanTypeId);
  const selectedSlotDetails = suggestions.find(s => s.slot === selectedSlot);

  // Group slots
  const bestSlots = suggestions.filter(s => s.status === 'BEST').sort((a, b) => b.score - a.score);
  const availableSlots = suggestions.filter(s => s.status === 'AVAILABLE');
  const takenSlots = suggestions.filter(s => s.status === 'TAKEN');

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in pb-12">
      
      {/* LEFT SECTION: 1-Click Selectors (7 Columns) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Step A: Clinic Selection (Omitted/Static if Operator) */}
        {user?.role === 'CLINIC_OPERATOR' ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-2xl text-purple-600">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Partner Clinic</span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">{selectedClinic?.name}</h3>
              <p className="text-slate-500 text-[11px] mt-0.5">{selectedClinic?.address}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3.5">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Building className="h-4 w-4 text-accent" /> 1. Select Partner Clinic
              </h3>
              <span className="text-[9px] font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded border border-slate-200/50 uppercase tracking-wide">
                {clinics.length} Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[190px] overflow-y-auto pr-1">
              {clinics.map((c) => {
                const isSelected = selectedClinicId === c._id;
                return (
                  <button
                    key={c._id}
                    onClick={() => setSelectedClinicId(c._id)}
                    className={`p-4 border rounded-2xl text-left transition-all relative flex flex-col justify-between h-[96px] cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <h4 className="font-extrabold text-xs tracking-tight line-clamp-1">{c.name}</h4>
                      <p className={`text-[10px] line-clamp-1 mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        {c.address || 'No Address Listed'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold font-mono tracking-tighter ${isSelected ? 'text-sky-400' : 'text-slate-500'}`}>
                      📞 {c.phone}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="h-4.5 w-4.5 text-white absolute top-4 right-4 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step B: Scan Type Selection */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-3.5">
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" /> 2. Choose Dental Scan Service
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scanTypes.map((s) => {
              const isSelected = selectedScanTypeId === s._id;
              return (
                <button
                  key={s._id}
                  onClick={() => setSelectedScanTypeId(s._id)}
                  className={`p-4 border rounded-2xl text-center transition-all relative flex flex-col justify-center items-center gap-1.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="font-extrabold text-xs tracking-tight block">{s.name}</span>
                  <span className={`text-[10px] font-bold block ${isSelected ? 'text-sky-400' : 'text-slate-400'}`}>
                    🕒 ~{s.durationMins} Mins
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="h-4.5 w-4.5 text-white absolute top-3 right-3 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step C: Date Selection (Not traditional calendar, but premium date pills!) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" /> 3. Select Dispatch Date
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/50 px-2 py-0.5 rounded font-mono">
              📅 {selectedDate}
            </span>
          </div>

          {/* Horizontal scrollbar of date cards */}
          <div className="flex gap-2.5 overflow-x-auto pb-2.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {availableDates.map((date) => {
              const dateVal = format(date, 'yyyy-MM-dd');
              const isSelected = selectedDate === dateVal;
              const dayOfWeek = format(date, 'eee'); // "Wed"
              const dayNum = format(date, 'dd'); // "20"
              const monthName = format(date, 'MMM'); // "May"

              return (
                <button
                  key={dateVal}
                  onClick={() => setSelectedDate(dateVal)}
                  className={`flex flex-col justify-center items-center py-3.5 px-5.5 border rounded-2xl min-w-[84px] text-center transition-all shrink-0 cursor-pointer ${
                    isSelected 
                      ? 'bg-slate-900 border-slate-900 text-white shadow-md scale-[1.03]' 
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${isSelected ? 'text-sky-400' : 'text-slate-400'}`}>
                    {dayOfWeek}
                  </span>
                  <span className="text-base font-extrabold tracking-tighter block my-0.5">{dayNum}</span>
                  <span className="text-[10px] font-semibold block">{monthName}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-slate-400 leading-normal">Appointments must be scheduled 24 hours in advance to compile the OSRM spatial travel matrix correctly.</p>
        </div>

      </div>

      {/* RIGHT SECTION: Slots suggestion & Final Instant Booking (5 Columns) */}
      <div className="lg:col-span-5 space-y-6">
        
        {/* Dynamic Slots Selection */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 min-h-[300px] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" /> 4. Choose Available Slots
            </h3>

            {loadingSlots ? (
              <div className="py-16 flex flex-col justify-center items-center gap-2.5 text-slate-400">
                <Loader2 className="h-7 w-7 text-accent animate-spin" />
                <span className="text-xs font-semibold">Running Spatial Route Optimizer...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic text-xs">
                Please ensure a clinic is selected above to suggest scheduling slots.
              </div>
            ) : (
              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                
                {/* BEST Recommendations */}
                {bestSlots.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-2 py-0.5 rounded uppercase tracking-wider block w-fit">
                      ✨ Recommended (Highly Efficient Stop)
                    </span>
                    
                    <div className="space-y-2">
                      {bestSlots.map((s) => (
                        <button
                          key={s.slot}
                          type="button"
                          onClick={() => setSelectedSlot(s.slot)}
                          className={`w-full p-4 border rounded-2xl flex items-center justify-between text-left transition-all relative cursor-pointer ${
                            selectedSlot === s.slot 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                              : 'bg-emerald-500/[0.03] border-emerald-500/15 text-slate-700 hover:bg-emerald-500/[0.07]'
                          }`}
                        >
                          <div className="flex gap-3.5 items-center">
                            <span className="font-extrabold text-sm font-mono tracking-tight shrink-0">{s.slot}</span>
                            <div className="space-y-0.5 leading-normal pr-4">
                              <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedSlot === s.slot ? 'text-sky-400' : 'text-emerald-700'}`}>
                                Route score: {s.score}
                              </span>
                              <span className={`text-[9px] block ${selectedSlot === s.slot ? 'text-slate-300' : 'text-slate-500'}`}>
                                {s.reason}
                              </span>
                            </div>
                          </div>
                          <CheckCircle2 className={`h-4.5 w-4.5 shrink-0 ${selectedSlot === s.slot ? 'text-white' : 'text-emerald-500'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard Available Slots */}
                {availableSlots.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Standard Open Hours</span>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((s) => (
                        <button
                          key={s.slot}
                          type="button"
                          onClick={() => setSelectedSlot(s.slot)}
                          className={`py-3 px-1 border rounded-xl text-center font-bold font-mono transition-all text-xs cursor-pointer ${
                            selectedSlot === s.slot 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {s.slot}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Taken Slots */}
                {takenSlots.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Taken / Blocked</span>
                    <div className="grid grid-cols-4 gap-2">
                      {takenSlots.map((s) => (
                        <div
                          key={s.slot}
                          className="py-2 px-1 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-center font-bold font-mono text-[10px] cursor-not-allowed flex items-center justify-center gap-0.5 opacity-60"
                          title={s.reason}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {s.slot}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Optional patient notes / instructions textbox */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Patient Instructions (Optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., fast 2 hours prior or ortho metallic adjustments..."
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800 resize-none"
            />
          </div>
        </div>

        {/* 5. Booking Action Summary Card */}
        <div className="bg-slate-900 text-white rounded-3xl p-6.5 shadow-md space-y-4">
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest block">Instant Review</span>
            
            <div className="text-xs font-semibold space-y-2 border-b border-white/10 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Clinic:</span>
                <span className="text-white text-right font-bold line-clamp-1">{selectedClinic?.name || 'None selected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Service:</span>
                <span className="text-white font-bold">{selectedScanType?.name || 'None selected'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Time & Date:</span>
                <span className="text-white font-mono font-bold">
                  {selectedSlot ? `${selectedSlot} @ ` : ''}{selectedDate}
                </span>
              </div>
              {selectedSlotDetails?.suggestedEmployeeId && (
                <div className="flex justify-between items-center text-[11px] bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl text-emerald-300">
                  <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Recommended Tech:</span>
                  <span className="font-extrabold">{selectedSlotDetails.suggestedEmployeeName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Large instant book button */}
          <button
            onClick={handleConfirmBooking}
            disabled={isSubmitting || !selectedClinicId || !selectedScanTypeId || !selectedDate || !selectedSlot}
            className="w-full py-4 px-6 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" /> Locking Slot...
              </>
            ) : (
              <>
                Confirm Smart Booking <ChevronRight className="h-4.5 w-4.5 text-emerald-200" />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
