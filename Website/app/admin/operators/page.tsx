'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Mail, 
  Key, 
  User, 
  Loader2, 
  X, 
  ShieldCheck 
} from 'lucide-react';

interface Operator {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function AdminOperatorsPage() {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newOpName, setNewOpName] = useState('');
  const [newOpEmail, setNewOpEmail] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchOperators() {
    try {
      const res = await fetch('/api/admin/operators');
      const data = await res.json();
      setOperators(data.operators || []);
    } catch (e) {
      console.error('Error fetching operators:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchOperators();
  }, []);

  const handleAddOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const toastId = toast.loading('Creating company operator account...');

    try {
      const res = await fetch('/api/admin/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOpName,
          email: newOpEmail,
          password: newOpPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create operator');
      }

      toast.success('Operator account created successfully!', { id: toastId });
      
      // Reset form & reload
      setNewOpName('');
      setNewOpEmail('');
      setNewOpPassword('');
      setShowAddModal(false);
      
      setIsLoading(true);
      await fetchOperators();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-7 w-7 text-accent" /> System Operators
          </h1>
          <p className="text-slate-500 text-sm mt-1">Register company dispatchers and manage administrative control nodes.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <UserPlus className="h-4 w-4" /> Add Company Operator
        </button>
      </div>

      {/* Operators List Panel */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Retrieving Operators...</span>
        </div>
      ) : operators.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Users className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">No Operators Found</h3>
            <p className="text-slate-400 text-xs mt-1">Create an operator account to allow dispatchers to book scans and schedule routes.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Operator Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Access Role</th>
                  <th className="py-4 px-6">Account Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {operators.map((op) => (
                  <tr key={op._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm select-none">
                          {op.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-extrabold text-slate-900 text-sm block">{op.name}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 font-mono text-slate-500">{op.email}</td>
                    <td className="py-4.5 px-6">
                      <span className="bg-sky-50 text-sky-700 border border-sky-100 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                        {op.role}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                        <ShieldCheck className="h-3.5 w-3.5" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* Add Operator Modal Dialog */}
      {/* -------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 border border-slate-100 shadow-2xl space-y-6 animate-scale-up">
            
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add Company Operator</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddOperator} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    required 
                    value={newOpName}
                    onChange={(e) => setNewOpName(e.target.value)}
                    placeholder="e.g. John Doe" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="email" 
                    required 
                    value={newOpEmail}
                    onChange={(e) => setNewOpEmail(e.target.value)}
                    placeholder="e.g. john@scanflow.com" 
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="password" 
                    required 
                    value={newOpPassword}
                    onChange={(e) => setNewOpPassword(e.target.value)}
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
                  {isSubmitting ? 'Creating...' : 'Save Operator'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
