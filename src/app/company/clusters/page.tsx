'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { EditClusterModal } from '@/components/modals/EditClusterModal';

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
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<any>(null);

   const [pan, setPan] = useState({ x: 0, y: 0 });
   const [zoom, setZoom] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
 
  const [manualOffsets, setManualOffsets] = useState<Record<string, number>>({});
  const [rotatingClusterId, setRotatingClusterId] = useState<string | null>(null);
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const mapRef = React.useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if not clicking a cluster
    if ((e.target as HTMLElement).closest('.cluster-dot')) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (rotatingClusterId && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      // Calculate center of map container in pixels
      const centerX = rect.left + rect.width / 2 + pan.x * zoom;
      const centerY = rect.top + rect.height / 2 + pan.y * zoom;
      
      // Calculate the current angle between center and mouse
      let angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      
      setManualOffsets(prev => ({
        ...prev,
        [rotatingClusterId]: angle
      }));
      return;
    }

    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setRotatingClusterId(null);
  };



  const fetchClusters = async () => {
    if (!user?.companyId) return;
    try {
      setLoading(true);
      const [clusterRes, routeRes] = await Promise.all([
        axios.get(`/api/clusters?companyId=${user.companyId}`),
        axios.get(`/api/routes?companyId=${user.companyId}`)
      ]);
      setClusters(clusterRes.data);
      setRoutes(routeRes.data);

      // Initialize manual offsets from DB if they exist and aren't already set locally
      const dbOffsets: Record<string, number> = {};
      clusterRes.data.forEach((c: any) => {
        if (c.visualAngle !== undefined) {
          dbOffsets[c._id] = c.visualAngle;
        }
      });
      
      setManualOffsets(prev => ({
        ...dbOffsets,
        ...prev // Local changes win
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLayout = async () => {
    try {
      setIsSavingLayout(true);
      await axios.put('/api/clusters/layout', { offsets: manualOffsets });
      // Refresh to ensure everything is in sync
      await fetchClusters();
    } catch (err) {
      console.error('Failed to save layout:', err);
    } finally {
      setIsSavingLayout(false);
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



  const globalRank = [...clusters].sort((a, b) => (a.distanceFromHQ || 0) - (b.distanceFromHQ || 0));
  
  const getClusterDistance = (cluster: any) => {
    const idx = globalRank.findIndex(c => c._id === cluster._id);
    return 15 + ((idx >= 0 ? idx : 0) * 12);
  };

  // Group clusters by route, preserving the sequence defined in the Route model
  const groupedClusters: any = {};
  const assignedClusterIds = new Set<string>();
  
  routes.forEach((route: any) => {
    const routeId = (route._id?.toString() || route._id);
    const clustersInRoute = (route.clusterIds || [])
      .map((cid: any) => {
        const id = (cid._id || cid).toString();
        const cluster = clusters.find(c => c._id.toString() === id);
        if (cluster) assignedClusterIds.add(id);
        return cluster;
      })
      .filter(Boolean);

    groupedClusters[routeId] = {
      id: routeId,
      name: route.name,
      clusters: clustersInRoute,
      sharedCount: 0
    };
  });

  // Collect ALL clusters not successfully assigned to a visible route
  const unassignedClusters = clusters.filter(c => !assignedClusterIds.has(c._id.toString()));
  if (unassignedClusters.length > 0) {
    groupedClusters['unassigned'] = {
      id: 'unassigned',
      name: 'Unassigned',
      clusters: unassignedClusters.sort((a, b) => (a.distanceFromHQ || 0) - (b.distanceFromHQ || 0)),
      sharedCount: 0
    };
  }

  // Greedy Adjacency Sort: Order routes so that those sharing clusters are physically next to each other
  const sortedRouteIds: string[] = [];
  const remainingIds = Object.keys(groupedClusters).filter(id => id !== 'unassigned');
  
  if (remainingIds.length > 0) {
    // Start with the route that has the most shared clusters to act as a hub
    remainingIds.sort((a, b) => {
      const aShared = remainingIds.filter(other => a !== other && 
        groupedClusters[a].clusters.some((c: any) => 
          (c.routeGroupIds || []).some((rg: any) => (rg._id || rg).toString() === other)
        )).length;
      const bShared = remainingIds.filter(other => b !== other && 
        groupedClusters[b].clusters.some((c: any) => 
          (c.routeGroupIds || []).some((rg: any) => (rg._id || rg).toString() === other)
        )).length;
      return bShared - aShared;
    });

    let currentId = remainingIds.shift()!;
    sortedRouteIds.push(currentId);
    
    while (remainingIds.length > 0) {
      let bestMatchIdx = -1;
      let maxShared = -1;
      
      for (let i = 0; i < remainingIds.length; i++) {
        const otherId = remainingIds[i];
        const shared = groupedClusters[currentId].clusters.filter((c: any) =>
          (c.routeGroupIds || []).some((rg: any) => (rg._id || rg).toString() === otherId.toString())
        ).length;
        
        if (shared > maxShared) {
          maxShared = shared;
          bestMatchIdx = i;
        }
      }
      
      // If no shared clusters found, just take the next one in list
      if (bestMatchIdx === -1) bestMatchIdx = 0;
      
      currentId = remainingIds.splice(bestMatchIdx, 1)[0];
      sortedRouteIds.push(currentId);
    }
  }
  if (groupedClusters['unassigned']) sortedRouteIds.push('unassigned');

  const visualGroups: any = {};
  let currentAngle = 30; // Start at a slight offset
  const totalRoutes = sortedRouteIds.length;
  
  // Adaptive spacing: Shared routes get 45 deg, unshared get the remaining space
  const sharedCount = sortedRouteIds.filter((id, idx) => {
    if (idx === 0) return false;
    const prevId = sortedRouteIds[idx - 1];
    return groupedClusters[id].clusters.some((c: any) =>
      (c.routeGroupIds || []).some((rg: any) => (rg._id || rg).toString() === prevId.toString())
    );
  }).length;
  
  const remainingSpace = 360 - (sharedCount * 45);
  const unsharedGap = Math.max(50, remainingSpace / Math.max(1, totalRoutes - sharedCount));

  sortedRouteIds.forEach((id, idx) => {
    const group = groupedClusters[id];

    // Determine the gap from the previous route
    if (idx > 0) {
      const prevId = sortedRouteIds[idx - 1];
      const sharesWithPrev = group.clusters.some((c: any) =>
        (c.routeGroupIds || []).some((rg: any) => (rg._id || rg).toString() === prevId.toString())
      );

      // Add the calculated gap
      currentAngle += sharesWithPrev ? 45 : unsharedGap;
    }

    const angleRad = (currentAngle % 360) * (Math.PI / 180);

    visualGroups[id] = {
      ...group,
      angle: angleRad,
      color: ROUTE_COLORS[idx % ROUTE_COLORS.length],
      stroke: ROUTE_STROKES[idx % ROUTE_STROKES.length]
    };
  });

  // Special handling for multiple unassigned to spread them out
  // We do this BEFORE calculating individual cluster angles
  if (visualGroups['unassigned'] && visualGroups['unassigned'].clusters.length > 1) {
    const unassignedGroup = visualGroups['unassigned'];
    const unassignedClustersList = unassignedGroup.clusters;
    delete visualGroups['unassigned'];
    
    unassignedClustersList.forEach((c: any, i: number) => {
      const tempId = `unassigned-temp-${i}`;
      // Use the base unassigned angle but spread them out slightly
      const spreadAngle = (unassignedGroup.angle * 180 / Math.PI) + (i * 30);
      const angleRad = spreadAngle * (Math.PI / 180);
      
      visualGroups[tempId] = {
        id: tempId,
        name: 'Unassigned',
        clusters: [c],
        angle: angleRad,
        color: ROUTE_COLORS[(sortedRouteIds.length + i) % ROUTE_COLORS.length],
        stroke: ROUTE_STROKES[(sortedRouteIds.length + i) % ROUTE_STROKES.length]
      };
    });
  }

  // Helper to get average angle for a cluster
  const getClusterAngle = (cluster: any) => {
    // If user has manually rotated this cluster, use that angle
    if (manualOffsets[cluster._id] !== undefined) {
      return manualOffsets[cluster._id];
    }

    // Find ALL groups in visualGroups that contain this cluster
    const containingGroups = Object.values(visualGroups).filter((g: any) => 
      g.clusters.some((c: any) => c._id.toString() === cluster._id.toString())
    );

    if (containingGroups.length === 0) return (45 * Math.PI / 180);
    
    // Average the angles of all groups this cluster belongs to
    const sum = containingGroups.reduce((acc: number, g: any) => acc + g.angle, 0);
    return sum / containingGroups.length;
  };

  // Pre-calculate coordinates for each group's view of their clusters
  Object.keys(visualGroups).forEach(key => {
    const group = visualGroups[key];
    const distances = group.clusters.map((c: any) => getClusterDistance(c));
    const isRetracing = distances.some((d: number, i: number) => i > 0 && d <= distances[i-1]);

    visualGroups[key].clusters = visualGroups[key].clusters.map((cluster: any, i: number) => {
      const distance = getClusterDistance(cluster);
      let clusterAngle = getClusterAngle(cluster);
      
      const isShared = (cluster.routeGroupIds || []).length > 1;

      // If the route retraces, apply a slight angular nudge per stop 
      // to 'fan out' the points and avoid line overlaps.
      // CRITICAL: We only apply this to NON-SHARED clusters to ensure 
      // shared hubs stay as a single dot on the map.
      if (isRetracing && !isShared) {
        const spreadFactor = 0.08; // ~4.5 degrees
        clusterAngle += (i * spreadFactor) - ((group.clusters.length - 1) * spreadFactor / 2);
      }

      return {
        ...cluster,
        x: 50 + Math.cos(clusterAngle) * distance,
        y: 50 + Math.sin(clusterAngle) * distance,
        visualAngle: clusterAngle // Store the specific angle used for this group
      };
    });
  });

  // Pre-calculate label offsets for routes sharing the same last cluster
  const labelOffsets = useMemo(() => {
    const offsets: Record<string, number> = {};
    const clusterUsage: Record<string, number> = {};
    
    // Process routes in sorted order
    sortedRouteIds.forEach((routeId) => {
      const group = visualGroups[routeId];
      const lastCluster = group?.clusters[group?.clusters.length - 1];
      if (lastCluster) {
        const key = lastCluster._id;
        offsets[routeId] = (clusterUsage[key] || 0) * 22; // 22px offset
        clusterUsage[key] = (clusterUsage[key] || 0) + 1;
      }
    });
    return offsets;
  }, [visualGroups, sortedRouteIds]);

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
          <div className="flex items-center gap-3">
            {Object.keys(manualOffsets).length > 0 && (
              <button
                onClick={handleSaveLayout}
                disabled={isSavingLayout}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-200 transition-colors disabled:opacity-50"
              >
                {isSavingLayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                {isSavingLayout ? 'Saving...' : 'Save Layout'}
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Cluster
            </button>
          </div>
        </header>

        <CreateClusterModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          companyId={user?.companyId}
          onSuccess={fetchClusters}
        />

        <EditClusterModal
          isOpen={!!editingCluster}
          onClose={() => setEditingCluster(null)}
          cluster={editingCluster}
          onSuccess={fetchClusters}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 card-premium h-[500px] relative overflow-hidden bg-slate-900">
            {/* Mock Map Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            <div className="relative z-10 p-6 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur rounded-lg text-white text-xs font-bold border border-white/10">
                <Navigation className="w-3.5 h-3.5" /> Live Map Simulation
              </div>

              <div className="flex items-center gap-2 bg-white/10 backdrop-blur p-1 rounded-lg border border-white/10">
                <button 
                  onClick={() => setZoom(prev => Math.min(prev + 0.2, 3))}
                  className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors font-bold"
                >
                  +
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                <button 
                  onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
                  className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 rounded transition-colors font-bold"
                >
                  -
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                <button 
                  onClick={() => { setPan({x: 0, y: 0}); setZoom(1); }}
                  className="px-2 h-8 flex items-center justify-center text-[10px] text-white/70 hover:text-white uppercase font-black"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Interaction Layer */}
            <div
              ref={mapRef}
              className={cn("absolute inset-0 flex items-center justify-center overflow-hidden", isDragging ? "cursor-grabbing" : rotatingClusterId ? "cursor-alias" : "cursor-grab")}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {loading ? (
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              ) : clusters.length === 0 ? (
                <p className="text-slate-500 font-medium">No clusters to display</p>
              ) : (
                <div className="relative w-full h-full origin-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                  {/* Connection Lines Layer */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {Object.values(visualGroups).map((group: any, groupIndex: number) => {
                      const angle = group.angle;

                      // Calculate points for the full route line
                      const polylinePoints = ["50,50"];
                      group.clusters.forEach((cluster: any) => {
                        polylinePoints.push(`${cluster.x},${cluster.y}`);
                      });

                      return (
                        <g key={`group-lines-${groupIndex}`}>
                          {/* Full Route Vector Line (Background) */}
                          <polyline
                            points={polylinePoints.join(' ')}
                            stroke={group.stroke}
                            fill="none"
                            strokeWidth="1.2"
                            opacity="0.1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {group.clusters.map((cluster: any, i: number) => {
                            if (i === 0) {
                              // Curved path from HQ to first cluster
                              const routeAngle = group.angle;
                              const clusterAngle = cluster.visualAngle || getClusterAngle(cluster);
                              const angleDiff = routeAngle - clusterAngle;
                              
                              // Curvature direction depends on side relative to cluster
                              const curveDir = Math.sign(angleDiff) || 1;
                              const qx = (50 + cluster.x) / 2 + Math.cos(routeAngle + curveDir * 0.2) * 5;
                              const qy = (50 + cluster.y) / 2 + Math.sin(routeAngle + curveDir * 0.2) * 5;
                              
                              return (
                                <path
                                  key={`hq-line-${cluster._id}-${group.id}`}
                                  d={`M 50 50 Q ${qx} ${qy} ${cluster.x} ${cluster.y}`}
                                  fill="none"
                                  stroke={group.stroke} strokeWidth="0.6" strokeDasharray="1.5,1.5" opacity="0.6"
                                />
                              );
                            }

                            const prev = group.clusters[i - 1];
                            const isLast = i === group.clusters.length - 1;
                            const isShared = (cluster.routeGroupIds || []).length > 1;

                            // Curved path between clusters
                            const midX = (prev.x + cluster.x) / 2;
                            const midY = (prev.y + cluster.y) / 2;
                            
                            // Base pull away from center
                            const distToCenter = Math.sqrt(Math.pow(midX - 50, 2) + Math.pow(midY - 50, 2));
                            let qx = midX + (midX - 50) / (distToCenter || 1) * 4;
                            let qy = midY + (midY - 50) / (distToCenter || 1) * 4;

                            // If it's the endpoint and shared, add a 'swoop' effect
                            if (isLast && isShared) {
                              const routeAngle = group.angle;
                              const clusterAngle = cluster.visualAngle || getClusterAngle(cluster);
                              const angleDiff = routeAngle - clusterAngle;
                              
                              // Pull the control point perpendicular to the route trajectory 
                              // to create a 'hook' or 'spiral' landing effect.
                              const swoopPower = 8;
                              // The direction is chosen to 'overshoot' the cluster's averaged position
                              // making the line curve back into it.
                              qx += Math.cos(routeAngle + Math.PI/2) * Math.sign(angleDiff) * swoopPower;
                              qy += Math.sin(routeAngle + Math.PI/2) * Math.sign(angleDiff) * swoopPower;
                            }

                            return (
                              <path
                                key={`chain-line-${cluster._id}-${group.id}`}
                                d={`M ${prev.x} ${prev.y} Q ${qx} ${qy} ${cluster.x} ${cluster.y}`}
                                fill="none"
                                stroke={group.stroke} strokeWidth="1.2" opacity="0.8" strokeLinecap="round"
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
                          return (
                            <div
                              key={`${cluster._id}-${group.id}`}
                              className={cn(
                                "absolute group cursor-pointer z-10 -translate-x-1/2 -translate-y-1/2 cluster-dot",
                                rotatingClusterId === cluster._id ? "cursor-grabbing scale-125" : "cursor-grab"
                              )}
                              style={{ left: `${cluster.x}%`, top: `${cluster.y}%` }}
                              onClick={() => setEditingCluster(cluster)}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setRotatingClusterId(cluster._id);
                              }}
                            >
                              <div className={cn("absolute -inset-4 rounded-full animate-ping duration-1000 opacity-20", group.color)}></div>
                              <div className={cn("relative w-4 h-4 border-2 border-white rounded-full shadow-lg transition-transform", group.color, rotatingClusterId === cluster._id && "scale-110")}></div>
                              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-white rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
                                <p className="text-[10px] font-black text-slate-900">{cluster.name}</p>
                              </div>
                            </div>
                          );
                        })}
                        {/* Route Path Label */}
                        {(() => {
                          const lastCluster = group.clusters[group.clusters.length - 1];
                          if (!lastCluster || group.id === 'unassigned') return null;
                          
                          // Position label at the midpoint of the route vector
                          const midDist = (getClusterDistance(lastCluster) * 0.6); // 60% out from HQ
                          const angle = group.angle;
                          const lx = 50 + Math.cos(angle) * midDist;
                          const ly = 50 + Math.sin(angle) * midDist;
                          
                          // Calculate rotation in degrees
                          let rotation = angle * (180 / Math.PI);
                          // Keep text upright (between -90 and 90 degrees)
                          if (rotation > 90 && rotation < 270) rotation += 180;
                          
                          return (
                            <div
                              className="absolute z-0 pointer-events-none"
                              style={{ 
                                left: `${lx}%`, 
                                top: `${ly}%`,
                                transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                              }}
                            >
                              <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20 whitespace-nowrap shadow-xl", group.color.replace('bg-', 'text-'))}>
                                {group.name}
                              </span>
                            </div>
                          );
                        })()}
                      </React.Fragment>
                    );
                  })}
                </div>
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
                  {group.clusters.map((cluster: any, i: number) => (
                    <div key={cluster._id + group.id} className="card-premium hover:border-blue-200 transition-all cursor-pointer group" onClick={() => setEditingCluster(cluster)}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", group.color?.replace('bg-', 'text-') || 'text-slate-400')}>
                          Stop #{i + 1} • {cluster.name}
                        </span>
                        <button
                          className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          onClick={(e) => { e.stopPropagation(); setEditingCluster(cluster); }}
                        >
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
