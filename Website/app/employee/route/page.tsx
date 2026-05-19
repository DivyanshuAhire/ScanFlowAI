'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  CalendarDays, 
  Map, 
  Navigation, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Building,
  Activity,
  FileText,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  _id: string;
  slotTime: string;
  durationMins: number;
  clinicId: {
    name: string;
    address?: string;
    lat: number;
    lng: number;
  };
  scanTypeId: {
    name: string;
  };
  status: 'CONFIRMED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

interface Assignment {
  _id: string;
  date: string;
  routeId: {
    name: string;
    color: string;
  };
  appointmentIds: Appointment[];
  idleGapWarning: boolean;
}

export default function EmployeeRoutePage() {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function fetchRouteSheet() {
    if (!user?.employeeId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/assignments/employee/${user.employeeId}?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAssignment(data.assignment);
      } else {
        setAssignment(null);
      }
    } catch (e) {
      console.error('Error fetching technician route sheet:', e);
      toast.error('Failed to load today\'s route sheet');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRouteSheet();
  }, [selectedDate, user]);

  const handleMarkCompleted = async (apptId: string) => {
    setUpdatingId(apptId);
    const toastId = toast.loading('Logging scan completion...');

    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      if (!res.ok) {
        throw new Error('Failed to update status');
      }

      toast.success('Appointment logged as COMPLETED successfully!', { id: toastId });
      
      // Reload route sheet
      await fetchRouteSheet();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred', { id: toastId });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">Pending Scan</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">Completed</span>;
      default:
        return <span className="bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-16">
      
      {/* Title & Date Selector */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Map className="h-7 w-7 text-accent" /> My Dispatch Route
          </h1>
          <p className="text-slate-500 text-sm mt-1">Audit assigned clinic stops, see patient details, and log scan accomplishments.</p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl pl-3 pr-4 py-2.5 shadow-sm self-start">
          <CalendarDays className="h-4.5 w-4.5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold font-mono focus:outline-none bg-transparent text-slate-800 cursor-pointer"
          />
        </div>
      </div>

      {/* Main Content Pane */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Retrieving Daily Route...</span>
        </div>
      ) : !assignment || !assignment.appointmentIds || assignment.appointmentIds.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Map className="h-12 w-12 text-slate-300 mx-auto animate-pulse" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">No Dispatches Scheduled</h3>
            <p className="text-slate-400 text-xs mt-1">There are no diagnostic scans assigned to you for this date.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Active Route Header Card */}
          <div 
            className="border p-6 rounded-3xl bg-white shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4"
            style={{ borderColor: `${assignment.routeId.color}20` }}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Dispatch Vector</span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">{assignment.routeId.name}</h3>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="bg-slate-50 border border-slate-100 text-slate-700 px-3.5 py-1.5 rounded-2xl text-[10px] font-bold uppercase tracking-wider block font-mono">
                {assignment.appointmentIds.length} Total Clinic Stops
              </span>
              <span 
                className="w-4.5 h-4.5 rounded-full border border-white ring-2 block"
                style={{
                  backgroundColor: assignment.routeId.color,
                  ringColor: assignment.routeId.color
                } as any}
              ></span>
            </div>
          </div>

          {/* Chronological Stop Timeline Cards */}
          <div className="space-y-6 relative pl-6">
            {/* Timeline line tracker */}
            <div className="absolute left-2.5 top-4 bottom-4 w-0.5 bg-slate-200"></div>

            {assignment.appointmentIds.map((appt, idx) => {
              const clinic = appt.clinicId;
              const isAssigned = appt.status === 'ASSIGNED';
              
              // Google Maps navigation url
              const mapUrl = `https://www.google.com/maps/search/?api=1&query=${clinic.lat},${clinic.lng}`;

              return (
                <div 
                  key={appt._id} 
                  className={`bg-white border rounded-3xl p-6.5 shadow-sm space-y-5 relative transition-all duration-200 ${
                    appt.status === 'COMPLETED' 
                      ? 'border-emerald-100 bg-emerald-50/[0.01]' 
                      : 'border-slate-100 hover:shadow-md'
                  }`}
                >
                  {/* Timeline bullet tag */}
                  <div 
                    className="absolute -left-6 top-7 h-2.5 w-2.5 rounded-full border-2 border-white ring-2"
                    style={{
                      backgroundColor: appt.status === 'COMPLETED' ? '#10b981' : assignment.routeId.color,
                      ringColor: appt.status === 'COMPLETED' ? '#10b981' : assignment.routeId.color
                    } as any}
                  ></div>

                  {/* Top Header Row */}
                  <div className="flex justify-between items-start gap-4 border-b border-slate-100 pb-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stop #{idx + 1}</span>
                      <h4 className="font-extrabold text-slate-900 text-base">{clinic.name}</h4>
                      <p className="text-slate-500 font-medium text-[11px] flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {clinic.address || 'No Address Provided'}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-slate-800 text-sm bg-slate-100 border border-slate-200/50 px-2.5 py-1 rounded-xl block shadow-sm">
                        🕒 {appt.slotTime}
                      </span>
                      {getStatusDisplay(appt.status)}
                    </div>
                  </div>

                  {/* Diagnostic details body */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1 bg-slate-50 border border-slate-100/50 p-4 rounded-2xl">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5 text-sky-500" /> Diagnostics Type
                      </span>
                      <span className="text-slate-800 font-extrabold text-xs block">{appt.scanTypeId?.name}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">~{appt.durationMins} Mins duration</span>
                    </div>

                    {appt.notes && (
                      <div className="space-y-1 bg-slate-50 border border-slate-100/50 p-4 rounded-2xl">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                          <FileText className="h-3.5 w-3.5 text-amber-500" /> Patient Instructions
                        </span>
                        <span className="text-slate-600 font-normal italic block">"{appt.notes}"</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar (Navigation & Log Completed) */}
                  <div className="flex flex-col sm:flex-row gap-3 border-t border-slate-100 pt-5">
                    {/* Navigation Trigger */}
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <Navigation className="h-4 w-4 animate-pulse text-sky-400" /> Navigate Stop (Google Maps)
                    </a>

                    {/* Completion Trigger */}
                    {isAssigned && (
                      <button
                        onClick={() => handleMarkCompleted(appt._id)}
                        disabled={updatingId === appt._id}
                        className="py-3 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {updatingId === appt._id ? (
                          <>
                            <Loader2 className="h-4.5 w-4.5 animate-spin" /> Logging...
                          </>
                        ) : (
                          <>
                            Mark Stop Completed <CheckCircle2 className="h-4.5 w-4.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}
