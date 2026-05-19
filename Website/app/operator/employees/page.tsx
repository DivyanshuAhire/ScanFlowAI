'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  UserCheck, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  Phone, 
  User, 
  Lock,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';

interface Employee {
  _id: string;
  name: string;
  phone: string;
  isActive: boolean;
}

export default function OperatorEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpPhone, setNewEmpPhone] = useState('');
  const [newEmpPassword, setNewEmpPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchEmployees() {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (e) {
      console.error('Error loading employees:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Registering field technician...');

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEmpName,
          phone: newEmpPhone,
          password: newEmpPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register employee');
      }

      toast.success('Technician registered successfully! Mobile login active.', { id: toastId });
      
      // Reset form & reload
      setNewEmpName('');
      setNewEmpPhone('');
      setNewEmpPassword('');
      setShowAddModal(false);
      
      setIsLoading(true);
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (empId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const toastId = toast.loading(`Toggling status...`);

    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus })
      });

      if (!res.ok) {
        throw new Error('Failed to toggle active status');
      }

      toast.success(`Technician is now ${nextStatus ? 'Active' : 'Inactive'}!`, { id: toastId });
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Toggle status failed', { id: toastId });
    }
  };

  const handleDeleteEmployee = async (empId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This will permanently erase their credentials.')) return;

    const toastId = toast.loading('Erasuring employee node...');
    try {
      const res = await fetch(`/api/employees/${empId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete employee');
      }

      toast.success('Technician record deleted successfully!', { id: toastId });
      setIsLoading(true);
      await fetchEmployees();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed', { id: toastId });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-accent" /> Field Technicians
          </h1>
          <p className="text-slate-500 text-sm mt-1">Register mobile technicians, manage their dispatch profiles, and audit their duty statuses.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Field Technician
        </button>
      </div>

      {/* Technicians List Grid */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Retrieving Technicians...</span>
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <UserCheck className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">No Technicians Found</h3>
            <p className="text-slate-400 text-xs mt-1">Add mobile technicians to begin assigning dispatch routes and daily sheets.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Technician Name</th>
                  <th className="py-4 px-6">Mobile Number</th>
                  <th className="py-4 px-6 text-center">Duty Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm select-none">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-slate-900 text-sm block">{emp.name}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-slate-500">{emp.phone}</td>
                    <td className="py-4.5 px-6 text-center">
                      <button
                        onClick={() => handleToggleStatus(emp._id, emp.isActive)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all border ${
                          emp.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50'
                        }`}
                      >
                        {emp.isActive ? (
                          <>
                            <ShieldCheck className="h-3 w-3" /> Active
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-3 w-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4.5 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleDeleteEmployee(emp._id)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                        title="Delete Technician"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* Add Employee Modal Dialog */}
      {/* -------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 border border-slate-100 shadow-2xl space-y-6 animate-scale-up">
            
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add Field Technician</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    placeholder="e.g. Michael Scott" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Number (Login Username)</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="tel" 
                    required 
                    value={newEmpPhone}
                    onChange={(e) => setNewEmpPhone(e.target.value)}
                    placeholder="e.g. 9876543210" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mobile Login Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="password" 
                    required 
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    placeholder="Min 6 characters" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center"
                >
                  {isSubmitting ? 'Registering...' : 'Save Technician'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
