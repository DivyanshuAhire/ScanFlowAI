'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/context/AuthContext';
import { 
  ClipboardList, 
  Trash2, 
  CalendarDays, 
  Loader2, 
  Building,
  User,
  Clock,
  Activity,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Appointment {
  _id: string;
  clinicId: {
    _id: string;
    name: string;
    address?: string;
  };
  date: string;
  slotTime: string;
  durationMins: number;
  scanTypeId: {
    _id: string;
    name: string;
  };
  status: 'CONFIRMED' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
  assignedEmployeeId?: {
    _id: string;
    name: string;
  };
  notes?: string;
}

export default function OperatorAppointmentsPage() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isLoading, setIsLoading] = useState(true);

  async function fetchAppointments() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${selectedDate}`);
      const data = await res.json();
      setAppointments(data.appointments || []);
    } catch (e) {
      console.error('Error fetching appointments:', e);
      toast.error('Failed to load appointments for this date');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel/delete this appointment booking?')) return;

    const toastId = toast.loading('Cancelling scan booking...');
    try {
      const res = await fetch(`/api/appointments/${apptId}`, {
        method: 'DELETE'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel appointment');
      }

      toast.success('Appointment cancelled successfully!', { id: toastId });
      
      // Re-fetch
      await fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel appointment', { id: toastId });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Confirmed</span>;
      case 'ASSIGNED':
        return <span className="bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Assigned</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Completed</span>;
      case 'CANCELLED':
        return <span className="bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Title & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-accent" /> Scan Appointments
          </h1>
          <p className="text-slate-500 text-sm mt-1">Audit, edit, and cancel scan bookings across all locations.</p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl pl-3 pr-4 py-2.5 shadow-sm">
          <CalendarDays className="h-4.5 w-4.5 text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold font-mono focus:outline-none bg-transparent text-slate-800 cursor-pointer"
          />
        </div>
      </div>

      {/* Main List Table */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Retrieving Daily Appointments...</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <ClipboardList className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">No Bookings Found</h3>
            <p className="text-slate-400 text-xs mt-1">There are no diagnostic dental scans booked for this date.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Clinic Info</th>
                  <th className="py-4 px-6">Slot Time</th>
                  <th className="py-4 px-6">Diagnostic Service</th>
                  <th className="py-4 px-6">Assigned Tech</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {appointments.map((appt) => {
                  const isAssigned = appt.status === 'ASSIGNED' || appt.status === 'COMPLETED';
                  // Hide cancel option for Operator if assigned (strict validation rules)
                  const cannotCancel = isAssigned && user?.role !== 'ADMIN';

                  return (
                    <tr key={appt._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4.5 px-6">
                        <span className="font-extrabold text-slate-900 text-sm block">{appt.clinicId?.name}</span>
                        <span className="text-slate-400 text-[10px] block mt-0.5">{appt.clinicId?.address || 'No Address Provided'}</span>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="font-extrabold font-mono text-slate-800 text-xs block">{appt.slotTime}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">~{appt.durationMins} mins duration</span>
                      </td>
                      <td className="py-4.5 px-6">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/50 text-[10px] font-bold">
                          {appt.scanTypeId?.name}
                        </span>
                      </td>
                      <td className="py-4.5 px-6">
                        {appt.assignedEmployeeId ? (
                          <span className="text-emerald-700 font-extrabold text-xs block flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> {appt.assignedEmployeeId.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic block">Unassigned</span>
                        )}
                      </td>
                      <td className="py-4.5 px-6">{getStatusBadge(appt.status)}</td>
                      <td className="py-4.5 px-6 text-right">
                        {cannotCancel ? (
                          <span 
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg"
                            title="Once confirmed/assigned, appointments can only be cancelled by Admin"
                          >
                            <AlertCircle className="h-3 w-3" /> Locked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleCancelAppointment(appt._id)}
                            className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                            title="Cancel Booking"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
