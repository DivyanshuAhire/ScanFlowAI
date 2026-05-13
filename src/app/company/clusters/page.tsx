'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Plus, 
  Map as MapIcon, 
  Layers, 
  Activity,
  MoreVertical,
  Loader2,
  Navigation,
  Building2
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { CreateClusterModal } from '@/components/modals/CreateClusterModal';

export default function ClustersPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchClusters = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/clusters?companyId=${user.companyId}`);
      setClusters(res.data);
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

    fetchClusters();
  }, [user, authLoading, router]);

  if (authLoading || (loading && clusters.length === 0 && user?.companyId)) {
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
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Cluster Visualization</h2>
            <p className="text-slate-500">Geospatial grouping of clinics for route optimization.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Cluster
          </button>
        </header>

        <CreateClusterModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          companyId={user?.companyId}
          onSuccess={fetchClusters}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 card-premium h-[500px] relative overflow-hidden bg-slate-900">
            {/* Mock Map Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-lg text-white text-xs font-bold border border-white/10">
                <Navigation className="w-3.5 h-3.5" /> Live Map Simulation
              </div>
            </div>

            {/* Interaction Layer */}
            <div className="absolute inset-0 flex items-center justify-center">
              {loading ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : clusters.length === 0 ? (
                <p className="text-slate-500 font-medium">No clusters to display</p>
              ) : (
                <>
                  {/* Connection Lines Layer */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {clusters.map((_, i) => {
                      const x2 = 30 + (i * 15);
                      const y2 = 40 + (i * 10);
                      return (
                        <line 
                          key={`line-${i}`}
                          x1="50%" 
                          y1="50%" 
                          x2={`${x2}%`} 
                          y2={`${y2}%`} 
                          stroke="rgba(59, 130, 246, 0.3)" 
                          strokeWidth="1"
                          strokeDasharray="5,5"
                        />
                      );
                    })}
                  </svg>

                  {/* Company HQ */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="relative">
                      <div className="absolute -inset-8 bg-emerald-500/20 rounded-full animate-pulse"></div>
                      <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-2 border-white">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 bg-slate-900 text-white rounded text-[10px] font-bold">
                        Company HQ
                      </div>
                    </div>
                  </div>

                  {/* Cluster Nodes */}
                  {clusters.map((cluster, i) => (
                    <div 
                      key={cluster._id}
                      className="absolute group cursor-pointer z-10"
                      style={{ 
                        left: `${30 + (i * 15)}%`, 
                        top: `${40 + (i * 10)}%` 
                      }}
                    >
                      {/* Pulsing ring */}
                      <div className="absolute -inset-4 bg-blue-500/20 rounded-full animate-ping group-hover:bg-blue-500/40 duration-1000"></div>
                      {/* Node */}
                      <div className="relative w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></div>
                      {/* Label */}
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-white rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-all">
                        <p className="text-[10px] font-black text-slate-900">{cluster.name}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" /> Active Clusters
            </h3>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : (
              clusters.map(cluster => (
                <div key={cluster._id} className="card-premium hover:border-blue-200 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">Cluster #{cluster.name.slice(-1)}</span>
                    <button className="text-slate-300 hover:text-slate-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-1">{cluster.name}</h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mb-4">
                    <Activity className="w-3 h-3" /> {cluster.distanceFromHQ}km from HQ
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Total Clinics</span>
                    <span className="text-xs font-bold text-slate-900">12</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
