'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Plus, 
  Truck, 
  MoreVertical,
  Loader2,
  Activity,
  Map,
  Navigation
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { CreateRouteModal } from '@/components/modals/CreateRouteModal';
import { EditRouteModal } from '@/components/modals/EditRouteModal';

export default function RoutesPage() {
  const { user, loading: authLoading } = useUser();
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);

  const fetchRoutes = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const [routeRes, clusterRes] = await Promise.all([
        axios.get(`/api/routes?companyId=${user.companyId}`),
        axios.get(`/api/clusters?companyId=${user.companyId}`)
      ]);
      setRoutes(routeRes.data);
      setClusters(clusterRes.data);
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

    fetchRoutes();
  }, [user, authLoading]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">Route Optimization</h1>
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100 flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5" />
                <span className="text-[10px] font-black uppercase tracking-widest">{routes.length} Active Routes</span>
              </div>
            </div>
            <p className="text-slate-500 font-medium text-sm">Manage and optimize diagnostic scan sequences.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" /> Create New Route
          </button>
        </header>

        <CreateRouteModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          companyId={user?.companyId}
          onSuccess={fetchRoutes}
        />

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
          {/* Desktop Table View */}
          <div className="card-premium !p-0 overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Route Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Clusters Included</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                        <span className="text-slate-500 text-sm font-medium">Fetching routes...</span>
                      </td>
                    </tr>
                  ) : routes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center">
                        <Map className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-900 font-bold">No routes defined</p>
                        <p className="text-slate-500 text-sm">Organize your field operations by creating routes.</p>
                      </td>
                    </tr>
                  ) : (
                    routes.map((route) => (
                      <tr key={route._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                              <Truck className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-slate-900">{route.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1.5 flex-wrap">
                            {route.clusterIds?.map((c: any, idx: number) => (
                              <span key={c._id || c} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 flex items-center gap-1">
                                <span className="opacity-50">{idx + 1}.</span> {clusters.find(cl => cl._id === (c._id || c))?.name || 'Cluster'}
                              </span>
                            )) || (
                              <span className="text-[10px] text-slate-400 font-medium italic">No clusters assigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedRoute(route);
                              setIsEditModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-slate-500 font-medium">Loading routes...</p>
              </div>
            ) : routes.length === 0 ? (
              <div className="py-20 text-center card-premium bg-white border-dashed border-slate-200">
                <Map className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500">No routes found.</p>
              </div>
            ) : (
              routes.map((route) => (
                <div key={route._id} className="card-premium bg-white border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Truck className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-slate-900 tracking-tight">{route.name}</h3>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedRoute(route);
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Route Sequence</span>
                      <div className="flex flex-wrap gap-2">
                        {route.clusterIds?.map((c: any, idx: number) => (
                          <div key={c._id || c} className="flex items-center">
                            <div className="px-2 py-1 bg-slate-900 text-white rounded-l text-[10px] font-black">
                              {idx + 1}
                            </div>
                            <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-r text-[10px] font-bold border-y border-r border-slate-200">
                              {clusters.find(cl => cl._id === (c._id || c))?.name || 'Cluster'}
                            </div>
                          </div>
                        )) || (
                          <span className="text-[10px] text-slate-400 font-medium italic">No clusters assigned</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-700">92% Efficiency</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Navigation className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-700">{route.clusterIds?.length || 0} Stops</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <EditRouteModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          companyId={user?.companyId}
          route={selectedRoute}
          onSuccess={fetchRoutes}
        />
      </main>
    </div>
  );
}
