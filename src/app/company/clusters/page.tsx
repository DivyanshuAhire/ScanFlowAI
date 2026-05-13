import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ClusterMap } from '@/components/dashboard/ClusterMap';
import { Plus, Search, Map as MapIcon } from 'lucide-react';

export default function ClustersPage() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Cluster Management</h2>
            <p className="text-slate-500">Visualize and optimize clinic groupings.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
              <MapIcon className="w-4 h-4" /> View Map
            </button>
            <button className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Cluster
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <ClusterMap />
          </div>

          <div className="card-premium">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Cluster List</h3>
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Andheri East', distance: '12 KM', clinics: 5, color: 'bg-blue-600' },
                { name: 'Powai', distance: '8 KM', clinics: 3, color: 'bg-indigo-600' },
                { name: 'Bandra West', distance: '15 KM', clinics: 8, color: 'bg-emerald-600' },
                { name: 'Malad West', distance: '22 KM', clinics: 4, color: 'bg-rose-500' },
              ].map((c) => (
                <div key={c.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", c.color)}></div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{c.distance} from HQ</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600">{c.clinics} Clinics</p>
                    <p className="text-[10px] text-slate-400">View Details</p>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-8 py-3 text-sm font-bold text-slate-500 border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-all">
              + Create New Cluster
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

import { cn } from '@/lib/utils';
