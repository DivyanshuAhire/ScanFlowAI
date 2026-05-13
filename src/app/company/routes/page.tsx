'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { 
  Plus, 
  Truck, 
  MoreVertical,
  Loader2,
  Activity,
  Map
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
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Route Management</h2>
            <p className="text-slate-500">Group clusters and optimize employee paths.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create Route
          </button>
        </header>

        <CreateRouteModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          companyId={user?.companyId}
          onSuccess={fetchRoutes}
        />

        <div className="card-premium !p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Route Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Clusters Included</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Efficiency Score</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Employees</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-2" />
                    <span className="text-slate-500 text-sm font-medium">Fetching routes...</span>
                  </td>
                </tr>
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
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
                        {clusters
                          .filter(c => (c.routeGroupIds || []).some((rg: any) => (rg._id || rg) === route._id))
                          .map(c => (
                            <span key={c._id} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100">
                              {c.name}
                            </span>
                          ))}
                        {clusters.filter(c => (c.routeGroupIds || []).some((rg: any) => (rg._id || rg) === route._id)).length === 0 && (
                          <span className="text-[10px] text-slate-400 font-medium italic">No clusters assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-bold text-slate-900">92%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">3 Employees</span>
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
