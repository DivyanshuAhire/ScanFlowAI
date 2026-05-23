'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  CalendarDays, 
  Compass, 
  Map, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { format, addDays } from 'date-fns';

interface EmployeeSheet {
  employee: { id: string; name: string };
  route: { id: string; name: string; color: string } | null;
  appointments: {
    appointmentId: string;
    time: string;
    clinicName: string;
    clusterName: string;
    address: string;
    travelFromPrevious: string;
    idleGap: string | null;
  }[];
  warnings: string[];
}

interface PreviewData {
  date: string;
  employeeSheets: EmployeeSheet[];
  unassigned: { appointmentId: string; clinicName: string; slot: string }[];
  totalWarnings: number;
}

export default function AssignRoutes() {
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [preview, setPreview] = useState<PreviewData | null>(null);
  
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);

  const fetchAssignmentPreview = async () => {
    setLoadingPreview(true);
    setHasConfirmed(false);
    const toastId = toast.loading('Compiling route schedules and travel times...');
    try {
      const res = await fetch(`/api/assignments/preview?date=${selectedDate}`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load preview');
      }

      setPreview(data.preview);
      toast.success('Daily route sheets generated successfully!', { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Route compilation failed', { id: toastId });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleLockAssignments = async () => {
    if (!confirm('Are you sure you want to LOCK daily schedules? This will notify field technicians.')) return;

    setIsLocking(true);
    const toastId = toast.loading('Locking and dispatching field schedules...');
    try {
      const res = await fetch(`/api/assignments/confirm?date=${selectedDate}`, {
        method: 'POST'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Lock failed');
      }

      setHasConfirmed(true);
      toast.success('Route assignments confirmed and locked! Technicians notified.', { id: toastId });
      
      // Reload preview state
      if (data.result) {
        setPreview(data.result);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Confirm lock failed', { id: toastId });
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="h-7 w-7 text-accent" /> Auto-Assignment Engine
          </h1>
          <p className="text-slate-500 text-sm mt-1">Compile EOD technician assignments, solve travel time matrices, and lock route dispatches.</p>
        </div>

        {/* Date Selector */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl pl-3 pr-4 py-2.5 shadow-sm">
            <CalendarDays className="h-4.5 w-4.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold font-mono focus:outline-none bg-transparent text-slate-800 cursor-pointer"
            />
          </div>
          <button
            onClick={fetchAssignmentPreview}
            disabled={loadingPreview || isLocking}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loadingPreview ? (
              <>
                <Loader2 className="h-4.5 w-4.5 animate-spin" /> Solving...
              </>
            ) : (
              <>
                Compile Schedules <Compass className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {loadingPreview ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2 bg-white border border-slate-100 rounded-3xl p-12 shadow-sm">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Solving geographical matrices & travel formulas...</span>
        </div>
      ) : !preview ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Compass className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">Route Compilation Needed</h3>
            <p className="text-slate-400 text-xs mt-1">Please pick a date (defaults to tomorrow) and click Compile Schedules above to inspect field worksheets.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          
          {/* Warnings & Global Counters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Global Warning Counter */}
            <div className={`bg-white border rounded-3xl p-6 shadow-sm flex items-center gap-4 ${preview.totalWarnings > 0 ? 'border-red-100' : 'border-slate-100'}`}>
              <div className={`p-4 rounded-2xl shrink-0 ${preview.totalWarnings > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                {preview.totalWarnings > 0 ? <AlertTriangle className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compliance Warnings</span>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight block">
                  {preview.totalWarnings === 0 ? 'Fully Compliant' : `${preview.totalWarnings} Warning${preview.totalWarnings > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Unassigned Bookings */}
            <div className={`bg-white border rounded-3xl p-6 shadow-sm flex items-center gap-4 ${preview.unassigned.length > 0 ? 'border-amber-100' : 'border-slate-100'}`}>
              <div className={`p-4 rounded-2xl shrink-0 ${preview.unassigned.length > 0 ? 'bg-amber-50 text-amber-500' : 'bg-sky-50 text-sky-500'}`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unassigned Bookings</span>
                <span className="text-2xl font-extrabold text-slate-900 tracking-tight block">
                  {preview.unassigned.length === 0 ? 'All Assigned' : `${preview.unassigned.length} Booking${preview.unassigned.length > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {/* Lock Dispatch Button */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-center">
              {hasConfirmed ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-5 py-3 rounded-2xl text-xs w-full justify-center">
                  <ShieldCheck className="h-5 w-5" /> Schedules Locked & Confirmed
                </div>
              ) : (
                <button
                  onClick={handleLockAssignments}
                  disabled={isLocking || preview.employeeSheets.every(s => s.appointments.length === 0)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLocking ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" /> Locking...
                    </>
                  ) : (
                    <>
                      Lock & Dispatch Field Routes <ShieldCheck className="h-4.5 w-4.5" />
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* Unassigned Details Panel */}
          {preview.unassigned.length > 0 && (
            <div className="bg-amber-50 border border-amber-200/50 rounded-3xl p-6 space-y-3">
              <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4.5 w-4.5" /> Unassigned Bookings Warning
              </h4>
              <p className="text-[10px] text-amber-700 leading-relaxed">
                The auto-assignment engine could not route these appointments because all available technicians have scheduling conflicts or direction flow limits. Manual adjustments are required.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                {preview.unassigned.map((u) => (
                  <div key={u.appointmentId} className="bg-white border border-amber-100 p-4.5 rounded-2xl text-xs">
                    <span className="font-extrabold text-slate-800 block">{u.clinicName}</span>
                    <span className="text-slate-400 text-[10px] font-bold font-mono block mt-1">🕒 Slot: {u.slot}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee Sheets Section */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-accent" /> Field Technician Daily Worksheets
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {preview.employeeSheets.map((sheet) => {
                const hasAppts = sheet.appointments.length > 0;
                
                return (
                  <div 
                    key={sheet.employee.id} 
                    className="bg-white border border-slate-100 rounded-3xl p-6.5 shadow-sm space-y-6 flex flex-col justify-between"
                  >
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Technician Name</span>
                        <h4 className="font-extrabold text-slate-900 text-base block">{sheet.employee.name}</h4>
                      </div>
                      
                      {sheet.route ? (
                        <span 
                          className="px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase border"
                          style={{
                            backgroundColor: `${sheet.route.color}10`,
                            borderColor: `${sheet.route.color}30`,
                            color: sheet.route.color
                          }}
                        >
                          Route: {sheet.route.name}
                        </span>
                      ) : (
                        <span className="bg-slate-50 border border-slate-200 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase">
                          Idle / Off Duty
                        </span>
                      )}
                    </div>

                    {/* Timeline stops */}
                    {hasAppts ? (
                      <div className="relative pl-6 space-y-6 flex-1">
                        {/* Vertical line indicator */}
                        <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200"></div>

                        {sheet.appointments.map((appt, idx) => {
                          const hasIdleWarning = appt.idleGap && appt.idleGap.includes('idle') && Number(appt.idleGap.split('h')[0]) >= 3;

                          return (
                            <div key={appt.appointmentId} className="relative space-y-2">
                              {/* Colored node dot */}
                              <div 
                                className="absolute -left-6 top-1.5 h-2 w-2 rounded-full border-2 border-white ring-2"
                                style={{
                                  ringColor: sheet.route?.color || '#3b82f6',
                                  backgroundColor: sheet.route?.color || '#3b82f6'
                                } as any}
                              ></div>

                              {/* Travel time header (if not first stop) */}
                              {idx > 0 && (
                                <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-lg inline-block font-mono mb-1">
                                  🚙 Travel: {appt.travelFromPrevious}
                                </div>
                              )}

                              <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-slate-900 text-xs block">{appt.clinicName}</span>
                                  <span className="text-slate-400 text-[10px] font-medium block">📍 {appt.clusterName} ({appt.address})</span>
                                </div>
                                <span className="font-mono font-bold text-slate-800 text-xs shrink-0 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded">
                                  {appt.time}
                                </span>
                              </div>

                              {/* Idle Gap Warning display */}
                              {appt.idleGap && (
                                <div className={`text-[10px] font-bold px-2 py-1 rounded-lg inline-block font-mono ${hasIdleWarning ? 'bg-amber-50 border border-amber-200 text-amber-700' : 'bg-slate-50 border border-slate-200 text-slate-500'}`}>
                                  🕒 Idle time: {appt.idleGap} {hasIdleWarning ? '⚠️ (Exceeds 3hr Limit)' : ''}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400 italic text-xs flex-1 flex flex-col justify-center gap-2">
                        <Compass className="h-8 w-8 text-slate-200 mx-auto" />
                        <span>No assignments for this technician on this date.</span>
                      </div>
                    )}

                    {/* Warnings and compliance */}
                    {sheet.warnings.length > 0 && (
                      <div className="bg-red-50 border border-red-100 p-4.5 rounded-2xl space-y-1.5 shrink-0">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Compliance Warnings</span>
                        {sheet.warnings.map((w, wIdx) => (
                          <p key={wIdx} className="text-[10px] text-red-600 leading-normal flex items-start gap-1">
                            <span className="shrink-0">•</span> {w}
                          </p>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
