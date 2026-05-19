'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Search, 
  Plus, 
  Users, 
  Phone, 
  Mail,
  MoreVertical,
  Loader2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { CreateEmployeeModal } from '@/components/modals/CreateEmployeeModal';
import { EditEmployeeModal } from '@/components/modals/EditEmployeeModal';

export default function EmployeesPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const fetchEmployees = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/employees?companyId=${user.companyId}`);
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!user.companyId) {
      setLoading(false);
      return;
    }

    fetchEmployees();
  }, [user, authLoading, router]);

  if (authLoading || (loading && employees.length === 0 && user?.companyId)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium animate-pulse">Syncing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="lg:ml-64 p-4 lg:p-8 pt-24 pb-[50vh]">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Employees</h2>
            <p className="text-slate-500 font-medium text-sm">Manage field technicians and route assignments.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </header>

        <CreateEmployeeModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          companyId={user?.companyId}
          onSuccess={fetchEmployees}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-slate-500 font-medium">Loading employees...</p>
            </div>
          ) : employees.length === 0 ? (
            <div className="col-span-full py-20 text-center card-premium bg-white border-dashed border-slate-200">
              <p className="text-slate-500">No employees found. Recruit field staff to get started.</p>
            </div>
          ) : (
            employees.map((emp) => (
              <div key={emp._id} className="card-premium group">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 relative">
                    <Users className="w-7 h-7" />
                    <span className={cn(
                      "absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white",
                      emp.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                    )}></span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 text-slate-300 hover:text-slate-600 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mb-1">{emp.name}</h3>
                <p className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider text-[10px]">Field Technician</p>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  {emp.email && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" /> {emp.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {emp.phoneNumber}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" /> {emp.workTimings.start} - {emp.workTimings.end}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-600">Verified</span>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold">
                    {emp.assignedRouteId?.name || 'Floating'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        <EditEmployeeModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          companyId={user?.companyId}
          employee={selectedEmployee}
          onSuccess={fetchEmployees}
        />
      </main>
    </div>
  );
}
