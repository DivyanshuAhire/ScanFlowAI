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

const ROUTE_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500'
];

const ROUTE_STROKES = [
  '#3b82f6',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#f43f5e',
  '#06b6d4'
];

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

  // Group clusters by route (a cluster can be in multiple routes)
  const groupedClusters = clusters.reduce((acc: any, cluster: any) => {
    const routeGroups = cluster.routeGroupIds && cluster.routeGroupIds.length > 0 
      ? cluster.routeGroupIds 
      : [{ _id: 'unassigned', name: 'Unassigned' }];

    routeGroups.forEach((rg: any) => {
      const routeId = rg._id || rg;
      const routeName = rg.name || 'Unassigned';
      
      if (!acc[routeId]) {
        acc[routeId] = {
          id: routeId,
          name: routeName,
          clusters: [],
          sharedCount: 0
        };
      }
      acc[routeId].clusters.push(cluster);
    });
    return acc;
  }, {});

  // Sort routes so that those sharing clusters are adjacent
  const sortedRouteIds = Object.keys(groupedClusters).sort((a, b) => {
    if (a === 'unassigned') return 1;
    if (b === 'unassigned') return -1;
    const shared = groupedClusters[a].clusters.filter((c: any) => 
      (c.routeGroupIds || []).some((rg: any) => (rg._id || rg) === b)
    ).length;
    return shared > 0 ? -1 : 1;
  });

  const visualGroups: any = {};
  let currentAngle = 45;
  const totalRoutes = sortedRouteIds.length;
  const baseSpread = Math.max(40, 300 / Math.max(1, totalRoutes - 1));

  sortedRouteIds.forEach((id, idx) => {
    const group = groupedClusters[id];
    
    // Determine the gap from the previous route
    if (idx > 0) {
      const prevId = sortedRouteIds[idx - 1];
      const sharesWithPrev = group.clusters.some((c: any) => 
        (c.routeGroupIds || []).some((rg: any) => (rg._id || rg) === prevId)
      );
      
      // If sharing, force 40 deg, otherwise use the wider spread
      currentAngle += sharesWithPrev ? 40 : baseSpread;
    }
    
    const angleRad = currentAngle * (Math.PI / 180);
    
    visualGroups[id] = {
      ...group,
      angle: angleRad,
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      stroke: ROUTE_STROKES[idx % ROUTE_STROKES.length]
    };
  });

  // Helper to get average angle for a cluster
  const getClusterAngle = (cluster: any) => {
    const rIds = (cluster.routeGroupIds || []).map((rg: any) => rg._id || rg);
    if (rIds.length === 0) return visualGroups['unassigned']?.angle || (45 * Math.PI / 180);
    
    const angles = rIds
      .map((id: string) => visualGroups[id]?.angle)
      .filter((a: any) => a !== undefined);
      
    if (angles.length === 0) return (45 * Math.PI / 180);
    return angles.reduce((a: number, b: number) => a + b, 0) / angles.length;
  };

  // Special handling for multiple unassigned to spread them out
  if (visualGroups['unassigned'] && visualGroups['unassigned'].clusters.length > 1) {
    const unassigned = visualGroups['unassigned'].clusters;
    delete visualGroups['unassigned'];
    unassigned.forEach((c: any, i: number) => {
      const tempId = `temp-${i}`;
      currentAngle += 40;
      const angleRad = currentAngle * (Math.PI / 180);
      visualGroups[tempId] = {
        name: 'Unassigned',
        clusters: [c],
        angle: angleRad,
        color: ROUTE_COLORS[(sortedRouteIds.length + i) % ROUTE_COLORS.length],
        stroke: ROUTE_STROKES[(sortedRouteIds.length + i) % ROUTE_STROKES.length]
      };
    });
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
                    {Object.values(visualGroups).map((group: any, groupIndex: number) => {
                      const angle = group.angle;
                      
                      // Calculate farthest point for the full route line
                      const maxDistance = 15 + ((group.clusters.length - 1) * 12);
                      const fx = 50 + Math.cos(angle) * maxDistance;
                      const fy = 50 + Math.sin(angle) * maxDistance;

                      return (
                        <g key={`group-lines-${groupIndex}`}>
                          {/* Full Route Vector Line (Background) */}
                          <line 
                            x1="50%" y1="50%" 
                            x2={`${fx}%`} y2={`${fy}%`} 
                            stroke={group.stroke} 
                            strokeWidth="4" 
                            opacity="0.1"
                            strokeLinecap="round"
                          />
                          
                          {group.clusters.map((cluster: any, i: number) => {
                            const distance = 15 + (i * 12);
                            const clusterAngle = getClusterAngle(cluster);
                            const x = 50 + Math.cos(clusterAngle) * distance;
                            const y = 50 + Math.sin(clusterAngle) * distance;
                            
                            if (i === 0) {
                              return (
                                <line 
                                  key={`hq-line-${cluster._id}-${group.id}`}
                                  x1="50%" y1="50%" 
                                  x2={`${x}%`} y2={`${y}%`} 
                                  stroke={group.stroke} strokeWidth="1.5" strokeDasharray="4,2" opacity="0.6"
                                />
                              );
                            }
                            
                            const prevCluster = group.clusters[i-1];
                            const prevDistance = 15 + ((i - 1) * 12);
                            const prevAngle = getClusterAngle(prevCluster);
                            const px = 50 + Math.cos(prevAngle) * prevDistance;
                            const py = 50 + Math.sin(prevAngle) * prevDistance;
                            
                            return (
                              <line 
                                key={`chain-line-${cluster._id}-${group.id}`}
                                x1={`${px}%`} y1={`${py}%`} 
                                x2={`${x}%`} y2={`${y}%`} 
                                stroke={group.stroke} strokeWidth="3" opacity="0.8" strokeLinecap="round"
                              />
                            );
                          })}
                        </g>
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

                  {/* Cluster Nodes and Route Labels */}
                  {Object.values(visualGroups).map((group: any, groupIndex: number) => {
                    const angle = group.angle;
                    
                    return (
                      <React.Fragment key={`group-nodes-${groupIndex}`}>
                        {group.clusters.map((cluster: any, i: number) => {
                          const distance = 15 + (i * 12);
                          const clusterAngle = getClusterAngle(cluster);
                          const x = 50 + Math.cos(clusterAngle) * distance;
                          const y = 50 + Math.sin(clusterAngle) * distance;
                          
                          return (
                            <div 
                              key={`${cluster._id}-${group.id}`}
                              className="absolute group cursor-pointer z-10"
                              style={{ left: `${x}%`, top: `${y}%` }}
                            >
                              <div className={cn("absolute -inset-4 rounded-full animate-ping duration-1000 opacity-20", group.color)}></div>
                              <div className={cn("relative w-4 h-4 border-2 border-white rounded-full shadow-lg", group.color)}></div>
                              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-white rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
                                <p className="text-[10px] font-black text-slate-900">{cluster.name}</p>
                              </div>
                            </div>
                          );
                        })}
                        {/* Route End Label */}
                        {(() => {
                          const lastDist = 15 + (group.clusters.length * 12);
                          const lx = 50 + Math.cos(angle) * lastDist;
                          const ly = 50 + Math.sin(angle) * lastDist;
                          return (
                            <div 
                              className="absolute z-0 pointer-events-none"
                              style={{ left: `${lx}%`, top: `${ly}%` }}
                            >
                              <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 backdrop-blur-sm", group.color.replace('bg-', 'text-'))}>
                                {group.name}
                              </span>
                            </div>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
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
              Object.values(visualGroups).map((group: any) => (
                <div key={group.name + group.id} className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-4 rounded-full", group.color)}></div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{group.name}</h4>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">{group.clusters.length}</span>
                  </div>
                  {group.clusters.map((cluster: any) => (
                    <div key={cluster._id + group.id} className="card-premium hover:border-blue-200 transition-all cursor-pointer group">
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", group.color?.replace('bg-', 'text-') || 'text-slate-400')}>
                          Cluster #{cluster.name.slice(-1)}
                        </span>
                        <button className="text-slate-300 hover:text-slate-600">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-900 mb-1">{cluster.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Activity className="w-3 h-3" /> {cluster.distanceFromHQ}km from HQ
                      </p>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
