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
  AlertCircle,
  Search,
  Plus,
  Compass,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import BookingWizard from '@/components/booking/BookingWizard';
import AssignRoutes from '@/components/appointments/AssignRoutes';

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

  // Unified Dashboard States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [clinicSearch, setClinicSearch] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

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

  const filteredAppointments = appointments.filter(appt => {
    const matchClinic = appt.clinicId?.name.toLowerCase().includes(clinicSearch.toLowerCase());
    const matchEmployee = employeeSearch 
      ? appt.assignedEmployeeId?.name?.toLowerCase().includes(employeeSearch.toLowerCase()) 
      : true;
    return matchClinic && matchEmployee;
  });

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 relative">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="h-7 w-7 text-accent" /> Appointment Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage scan bookings and coordinate field assignments.</p>
        </div>
        
        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowBookingModal(true)}
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 px-5 rounded-2xl shadow flex items-center gap-2 text-xs transition-all active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" /> Book New Appointment
          </button>
          {(user?.role === 'ADMIN' || user?.role === 'COMPANY_OPERATOR') && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-2xl shadow flex items-center gap-2 text-xs transition-all active:scale-[0.99]"
            >
              <Compass className="h-4 w-4" /> Assign Routes
            </button>
          )}
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white border border-slate-100 rounded-3xl p-4 shadow-sm items-center">
        <div className="flex items-center gap-2 flex-1 w-full bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-100">
          <Search className="h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Clinic..."
            value={clinicSearch}
            onChange={(e) => setClinicSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-800 font-medium"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-1 w-full bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-100">
          <User className="h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Employee..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-100 rounded-2xl pl-3 pr-4 py-2.5">
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
      ) : filteredAppointments.length === 0 ? (
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
                {filteredAppointments.map((appt) => {
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

      {/* Overlays / Modals */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center z-10 rounded-t-3xl shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Book Scan Appointment</h2>
              <button onClick={() => setShowBookingModal(false)} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <BookingWizard onSuccess={() => {
                setShowBookingModal(false);
                fetchAppointments();
              }} />
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-50 rounded-3xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-4 flex justify-between items-center z-10 rounded-t-3xl shadow-sm">
              <h2 className="text-lg font-bold text-slate-800">Assign Routes</h2>
              <button onClick={() => setShowAssignModal(false)} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <AssignRoutes />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
