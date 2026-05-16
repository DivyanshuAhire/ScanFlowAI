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
import { EditRouteModal } from '@/components/modals/EditRouteModal';
import { CreateRouteModal } from '@/components/modals/CreateRouteModal';

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
  const hasAutoFitted = React.useRef(false);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);

  const [isCreateRouteModalOpen, setIsCreateRouteModalOpen] = useState(false);

  const [connectionMode, setConnectionMode] = useState(false);
  const [selectedForConnection, setSelectedForConnection] = useState<string[]>([]);
  const [manualDistances, setManualDistances] = useState<any[]>([]);
  const [isDistanceModalOpen, setIsDistanceModalOpen] = useState(false);
  const [pendingDistance, setPendingDistance] = useState<string>('');
  const [isSavingDistance, setIsSavingDistance] = useState(false);
  const [focusedRoute, setFocusedRoute] = useState<any>(null);

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

  const handleFitToView = () => {
    if (clusters.length === 0) return;

    // Find the max distance from HQ
    let maxDist = 0;
    clusters.forEach(c => {
      const d = getClusterDistance(c);
      if (d > maxDist) maxDist = d;
    });

    // Add some padding (20%)
    const paddedDist = maxDist * 1.2;

    // The coordinate system is 0-100 with HQ at 50,50.
    // Available space in coordinate units is 100.
    // So zoom should be 100 / (2 * paddedDist).
    const newZoom = Math.min(100 / (2 * paddedDist), 1.5); // Cap zoom at 1.5x

    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
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

  const fetchDistances = async () => {
    if (!user?.companyId) return;
    try {
      const res = await axios.get(`/api/clusters/distances?companyId=${user.companyId}`);
      setManualDistances(res.data);
    } catch (err) {
      console.error(err);
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

    fetchClusters().then(() => {
      // Only auto-fit on the very first load to avoid resetting user's view on refreshes
      if (!hasAutoFitted.current && clusters.length > 0) {
        setTimeout(() => {
          handleFitToView();
          hasAutoFitted.current = true;
        }, 500);
      }
    });
    fetchDistances();
  }, [user, authLoading, router]);



  const globalRank = [...clusters].sort((a, b) => (a.distanceFromHQ || 0) - (b.distanceFromHQ || 0));

  const getClusterDistance = (cluster: any) => {
    if (cluster.distanceFromHQ === 0) return 0;
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
    const isRetracing = distances.some((d: number, i: number) => i > 0 && d <= distances[i - 1]);

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
          <div className="flex items-center gap-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Cluster Visualization</h2>
              <p className="text-slate-500 text-sm">Geospatial grouping of clinics for route optimization.</p>
            </div>
            
            <div className="flex items-center gap-4 border-l border-slate-200 pl-8">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">{clusters.length} Clusters</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Navigation className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-wider">{routes.length} Routes</span>
              </div>
            </div>
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
              onClick={() => setConnectionMode(!connectionMode)}
              className={cn(
                "px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2",
                connectionMode ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Activity className="w-4 h-4" /> {connectionMode ? "Exit Connection Mode" : "Manage Distances"}
            </button>
            <button
              onClick={() => setIsCreateRouteModalOpen(true)}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Route
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Cluster
            </button>
          </div>
        </header>

        <CreateRouteModal
          isOpen={isCreateRouteModalOpen}
          onClose={() => setIsCreateRouteModalOpen(false)}
          companyId={user?.companyId}
          onSuccess={fetchClusters}
        />

        <EditRouteModal
          isOpen={isRouteModalOpen}
          onClose={() => setIsRouteModalOpen(false)}
          companyId={user?.companyId}
          route={selectedRoute}
          onSuccess={fetchClusters}
        />

        {/* Distance Management Modal */}
        {isDistanceModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 animate-in zoom-in duration-200">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Define Distance</h3>
              <p className="text-xs text-slate-500 mb-6">
                Enter distance between <strong>{clusters.find(c => c._id === selectedForConnection[0])?.name}</strong> and <strong>{clusters.find(c => c._id === selectedForConnection[1])?.name}</strong>.
              </p>
              <div className="space-y-4">
                <div className="relative">
                  <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Distance in KM"
                    value={pendingDistance}
                    onChange={(e) => setPendingDistance(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setIsDistanceModalOpen(false); setSelectedForConnection([]); }}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!pendingDistance || isSavingDistance}
                    onClick={async () => {
                      try {
                        setIsSavingDistance(true);
                        await axios.post('/api/clusters/distances', {
                          companyId: user?.companyId,
                          fromClusterId: selectedForConnection[0],
                          toClusterId: selectedForConnection[1],
                          distance: parseFloat(pendingDistance)
                        });
                        await fetchDistances();
                        setIsDistanceModalOpen(false);
                        setSelectedForConnection([]);
                        setPendingDistance('');
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setIsSavingDistance(false);
                      }
                    }}
                    className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    {isSavingDistance ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Distance"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  onClick={handleFitToView}
                  className="px-2 h-8 flex items-center justify-center text-[10px] text-white/70 hover:text-white uppercase font-black"
                >
                  Fit View
                </button>
              </div>
            </div>

            {/* Focused Route Indicator at Bottom */}
            {focusedRoute && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-4 duration-300">
                <div className="px-6 py-3 bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl flex items-center gap-4">
                  <div className={cn("w-3 h-3 rounded-full animate-pulse", focusedRoute.color)}></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/50 uppercase font-black tracking-widest leading-none mb-1">Active Route</span>
                    <span className="text-sm text-white font-black">{focusedRoute.name}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/50 uppercase font-black tracking-widest leading-none mb-1">Clusters</span>
                    <span className="text-sm text-white font-black">{focusedRoute.clusters.length}</span>
                  </div>
                </div>
              </div>
            )}

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
                  {/* Manual Distances Layer */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {manualDistances.map((md: any) => {
                      const fromId = md.fromClusterId?._id || md.fromClusterId;
                      const toId = md.toClusterId?._id || md.toClusterId;
                      const from = clusters.find(c => c._id === fromId);
                      const to = clusters.find(c => c._id === toId);
                      if (!from || !to) return null;

                      const fromAngle = manualOffsets[fromId] || 0;
                      const fromDist = getClusterDistance(from);
                      const toAngle = manualOffsets[toId] || 0;
                      const toDist = getClusterDistance(to);

                      const fx = 50 + Math.cos(fromAngle) * fromDist;
                      const fy = 50 + Math.sin(fromAngle) * fromDist;
                      const tx = 50 + Math.cos(toAngle) * toDist;
                      const ty = 50 + Math.sin(toAngle) * toDist;

                      return (
                        <g key={md._id}>
                          <line x1={fx} y1={fy} x2={tx} y2={ty} stroke="#94a3b8" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.4" />
                          <rect x={(fx + tx) / 2 - 2} y={(fy + ty) / 2 - 1.5} width="4" height="3" rx="1" fill="white" opacity="0.8" />
                          <text x={(fx + tx) / 2} y={(fy + ty) / 2 + 0.5} fill="#64748b" fontSize="1.5" fontWeight="black" textAnchor="middle">
                            {md.distance}km
                          </text>
                        </g>
                      );
                    })}
                  </svg>

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
                            strokeWidth="8"
                            opacity="0"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="cursor-pointer pointer-events-auto"
                            onMouseEnter={() => setFocusedRoute(group)}
                            onMouseLeave={() => setFocusedRoute(null)}
                          />
                          <polyline
                            points={polylinePoints.join(' ')}
                            stroke={group.stroke}
                            fill="none"
                            strokeWidth="1.2"
                            opacity={focusedRoute?.id === group.id ? "0.4" : "0.1"}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-opacity duration-300"
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
                              qx += Math.cos(routeAngle + Math.PI / 2) * Math.sign(angleDiff) * swoopPower;
                              qy += Math.sin(routeAngle + Math.PI / 2) * Math.sign(angleDiff) * swoopPower;
                            }

                            return (
                              <g key={`chain-group-${cluster._id}-${group.id}`} onMouseEnter={() => setFocusedRoute(group)} onMouseLeave={() => setFocusedRoute(null)}>
                                {/* Hit area for hovering */}
                                <path
                                  d={`M ${prev.x} ${prev.y} Q ${qx} ${qy} ${cluster.x} ${cluster.y}`}
                                  fill="none"
                                  stroke="transparent" strokeWidth="8" className="cursor-pointer pointer-events-auto"
                                />
                                <path
                                  d={`M ${prev.x} ${prev.y} Q ${qx} ${qy} ${cluster.x} ${cluster.y}`}
                                  fill="none"
                                  stroke={group.stroke} 
                                  strokeWidth={focusedRoute?.id === group.id ? "2" : "1.2"} 
                                  opacity={focusedRoute?.id === group.id ? "1" : "0.8"} 
                                  strokeLinecap="round"
                                  className="transition-all duration-300"
                                />
                              </g>
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
                              onMouseEnter={() => setFocusedRoute(group)}
                              onMouseLeave={() => setFocusedRoute(null)}
                              onClick={() => {
                                if (connectionMode) {
                                  if (selectedForConnection.includes(cluster._id)) {
                                    setSelectedForConnection(prev => prev.filter(id => id !== cluster._id));
                                  } else {
                                    const newSelected = [...selectedForConnection, cluster._id];
                                    if (newSelected.length === 2) {
                                      setSelectedForConnection(newSelected);
                                      setIsDistanceModalOpen(true);
                                    } else {
                                      setSelectedForConnection(newSelected);
                                    }
                                  }
                                } else {
                                  setEditingCluster(cluster);
                                }
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                if (!connectionMode) setRotatingClusterId(cluster._id);
                              }}
                            >
                              <div className={cn("absolute -inset-4 rounded-full animate-ping duration-1000 opacity-20", group.color)}></div>
                              <div className={cn(
                                "relative w-4 h-4 border-2 border-white rounded-full shadow-lg transition-transform",
                                group.color,
                                rotatingClusterId === cluster._id && "scale-110",
                                selectedForConnection.includes(cluster._id) && "ring-4 ring-slate-900 ring-offset-2"
                              )} style={{ transform: `scale(${Math.max(1, 0.7 / zoom)})` }}></div>
                              <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 bg-white rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-all border border-slate-100" style={{ transform: `translateX(-50%) scale(${1 / zoom})`, transformOrigin: 'top center' }}>
                                <p className="text-[10px] font-black text-slate-900">{cluster.name}</p>
                              </div>
                            </div>
                          );
                        })}
                         {/* Route Labels Removed as per request */}
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
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-4 rounded-full", group.color)}></div>
                      <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">{group.name}</h4>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md font-bold">{group.clusters.length}</span>
                    </div>
                    {group.id !== 'unassigned' && !group.id.includes('unassigned-temp') && (
                      <button
                        onClick={() => {
                          const route = routes.find(r => (r._id?.toString() || r._id) === group.id);
                          setSelectedRoute(route);
                          setIsRouteModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    )}
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
