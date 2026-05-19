'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Layers, Truck, MapPin, Loader2, Hospital, Home, Edit, Trash } from 'lucide-react';
import { toast } from 'sonner';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const hqIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const clinicIcons: Record<string, L.Icon> = {
  blue: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  green: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  orange: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  yellow: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  violet: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  gold: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  red: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  }),
  grey: new L.Icon({
    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
};

export default function MapVisualizer({ companyId }: { companyId: string }) {
  const [clinics, setClinics] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit Route states
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [editRouteName, setEditRouteName] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Dynamic route colors and markers setup
  const ROUTE_STYLES = [
    { color: '#3b82f6', marker: 'blue' },     // Blue
    { color: '#10b981', marker: 'green' },    // Green
    { color: '#f97316', marker: 'orange' },   // Orange
    { color: '#eab308', marker: 'yellow' },   // Yellow
    { color: '#8b5cf6', marker: 'violet' },   // Violet
    { color: '#d97706', marker: 'gold' },     // Gold
    { color: '#ef4444', marker: 'red' },      // Red
    { color: '#64748b', marker: 'grey' }      // Grey
  ];

  const getStrId = (idObj: any): string => {
    if (!idObj) return '';
    if (typeof idObj === 'string') return idObj;
    if (typeof idObj === 'object') {
      if (idObj.$oid) return idObj.$oid.toString();
      if (idObj._id) return getStrId(idObj._id);
      return idObj.toString();
    }
    return String(idObj);
  };

  const getRouteColorIndex = (routeIdStr: string) => {
    const idStr = getStrId(routeIdStr);
    if (!idStr) return 0;
    const hexPart = idStr.slice(-6);
    const num = parseInt(hexPart, 16);
    return isNaN(num) ? 0 : num % ROUTE_STYLES.length;
  };

  const routeColorMap: Record<string, string> = {};
  const routeMarkerMap: Record<string, string> = {};

  routes.forEach((r: any) => {
    const idStr = getStrId(r._id);
    const idx = getRouteColorIndex(idStr);
    const style = ROUTE_STYLES[idx];
    routeColorMap[idStr] = style.color;
    routeMarkerMap[idStr] = style.marker;
  });

  const getRouteId = (cluster: any) => {
    if (!cluster || !cluster.route_id) return null;
    return getStrId(cluster.route_id);
  };

  const getEdgeColor = (edge: any) => {
    let routeId: string | null = null;
    if (edge.from_cluster.toString() === companyId.toString()) {
      const c2 = clusters.find(c => c._id.toString() === edge.to_cluster.toString());
      routeId = getRouteId(c2);
    } else {
      const c1 = clusters.find(c => c._id.toString() === edge.from_cluster.toString());
      const c2 = clusters.find(c => c._id.toString() === edge.to_cluster.toString());
      routeId = getRouteId(c1) || getRouteId(c2);
    }

    if (routeId && routeColorMap[routeId]) {
      return routeColorMap[routeId];
    }
    return edge.from_cluster.toString() === companyId.toString() ? "#ef4444" : "#6366f1";
  };

  const handleSaveRouteChanges = async () => {
    if (!selectedRoute) return;
    try {
      setSaveLoading(true);
      await axios.put(`/api/routes/${selectedRoute._id}`, {
        name: editRouteName
      });
      toast.success('Route renamed successfully!');
      setSelectedRoute(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to rename route');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUnassignCluster = async (clusterId: string) => {
    if (!selectedRoute) return;
    const isRoot = selectedRoute.root_cluster === clusterId || selectedRoute.root_cluster?._id === clusterId;
    if (isRoot) {
      if (!window.confirm('This cluster is the main endpoint anchor of this route. Unassigning it will delete the route itself. Do you want to proceed?')) return;
      try {
        await axios.delete(`/api/routes/${selectedRoute._id}`);
        toast.success('Route deleted successfully.');
        setSelectedRoute(null);
        await fetchData();
      } catch (err: any) {
        toast.error('Failed to unassign anchor cluster');
      }
      return;
    }

    try {
      await axios.put(`/api/clusters/${clusterId}`, {
        route_id: null,
        routeGroupIds: []
      });
      toast.success('Cluster unassigned from route successfully!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to unassign cluster');
    }
  };

  const handleDeleteCluster = async (clusterId: string, clusterName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete cluster "${clusterName}" from the system? This will unassign all clinics in it.`)) return;
    try {
      await axios.delete(`/api/clusters/${clusterId}`);
      toast.success('Cluster deleted successfully!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to delete cluster. Make sure no clinics are currently assigned to it.');
    }
  };

  const handleRecalculateRoutes = async () => {
    if (!window.confirm('Are you sure you want to completely recalculate all routes? This will delete all existing routes and their custom names, unassign all clusters, and build brand new routes from scratch based on OSRM overlap.')) return;
    try {
      setLoading(true);
      await axios.get(`/api/clusters?companyId=${companyId}&forceReset=true`);
      toast.success('All routes recalculated from scratch successfully!');
      await fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to recalculate routes');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      // Fetch clusters sequentially first to trigger backend route Graph regeneration and merging
      const clustersRes = await axios.get(`/api/clusters?companyId=${companyId}`);
      setClusters(clustersRes.data);

      // Fetch remaining data only after routeGraphEngine has finished regeneration
      const [clinicsRes, routesRes, companiesRes] = await Promise.all([
        axios.get(`/api/clinics?companyId=${companyId}`),
        axios.get(`/api/routes?companyId=${companyId}`),
        axios.get('/api/companies'),
      ]);
      
      setClinics(clinicsRes.data);
      setRoutes(routesRes.data);

      const currentCompany = companiesRes.data.find((c: any) => c._id === companyId);
      setCompany(currentCompany);

      try {
        const edgesRes = await axios.get(`/api/clusters/edges?companyId=${companyId}`);
        setEdges(edgesRes.data);
      } catch(e) {
        console.warn("Could not fetch cluster edges");
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center bg-slate-50 rounded-2xl border border-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  let defaultCenter: [number, number] = [19.0760, 72.8777];
  if (company && company.hqLocation && company.hqLocation.lat) {
    defaultCenter = [company.hqLocation.lat, company.hqLocation.lng];
  } else if (clinics.length > 0 && clinics[0].lat) {
    defaultCenter = [clinics[0].lat, clinics[0].lng];
  }

  return (
    <div className="relative h-[700px] w-full rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      <MapContainer 
        key={`${companyId}-${defaultCenter[0]}-${defaultCenter[1]}`}
        center={defaultCenter} 
        zoom={11} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {/* Render HQ Marker */}
        {company && company.hqLocation && company.hqLocation.lat && (
          <Marker 
            position={[company.hqLocation.lat, company.hqLocation.lng]}
            icon={hqIcon}
          >
            <Popup>
              <div className="p-2 min-w-[150px]">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-sm">
                  <Home className="w-4 h-4 text-red-500" />
                  HQ: {company.name}
                </h4>
                <p className="text-xs text-slate-600">{company.address}</p>
                <div className="mt-2 text-[9px] font-extrabold uppercase text-red-500 tracking-wider bg-red-50 border border-red-100 rounded px-1.5 py-0.5 w-max">
                  HQ Operational Base
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Cluster Edges (Graph Route Lines color-coded by Route ID) */}
        {edges.filter((edge: any, index: number, self: any[]) => {
          return self.findIndex((e: any) => 
            (e.from_cluster.toString() === edge.from_cluster.toString() && e.to_cluster.toString() === edge.to_cluster.toString()) ||
            (e.from_cluster.toString() === edge.to_cluster.toString() && e.to_cluster.toString() === edge.from_cluster.toString())
          ) === index;
        }).map((edge: any) => {
          let startPos: [number, number] | null = null;
          let endPos: [number, number] | null = null;

          if (edge.from_cluster.toString() === companyId.toString() && company && company.hqLocation) {
            startPos = [company.hqLocation.lat, company.hqLocation.lng];
          } else {
            const c1 = clusters.find(c => c._id.toString() === edge.from_cluster.toString());
            if (c1) startPos = [c1.center_lat, c1.center_lng];
          }

          const c2 = clusters.find(c => c._id.toString() === edge.to_cluster.toString());
          if (c2) endPos = [c2.center_lat, c2.center_lng];

          if (startPos && endPos) {
            const pathPositions = edge.geometry && edge.geometry.length > 0 
              ? edge.geometry 
              : [startPos, endPos];
            
            const edgeColor = getEdgeColor(edge);
            
            return (
              <Polyline 
                key={edge._id} 
                positions={pathPositions}
                color={edgeColor}
                weight={edge.from_cluster.toString() === companyId.toString() ? 5 : 4}
                opacity={0.8}
                dashArray={edge.geometry ? undefined : "5, 10"}
              />
            );
          }
          return null;
        })}



        {/* Render Cluster Centroids (using Circle, color-coded by Route ID) */}
        {clusters.map((cluster: any) => {
          if (!cluster.center_lat || !cluster.center_lng) return null;
          const radiusMeters = cluster.type === 'PRIMARY' ? 2000 : 1000;
          
          const cRouteId = getRouteId(cluster);
          const circleColor = cRouteId && routeColorMap[cRouteId]
            ? routeColorMap[cRouteId]
            : (cluster.type === 'PRIMARY' ? '#3b82f6' : cluster.type === 'SUBCLUSTER' ? '#10b981' : '#f59e0b');

          return (
            <Circle
              key={cluster._id}
              center={[cluster.center_lat, cluster.center_lng]}
              radius={radiusMeters}
              pathOptions={{
                color: circleColor,
                fillColor: circleColor,
                fillOpacity: 0.08,
                weight: 2
              }}
            >
              <Popup>
                <div className="p-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    {cluster.name || 'Cluster'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">Type: {cluster.type}</p>
                  {cluster.route_id && (
                    <p className="text-xs font-bold text-slate-600 mt-1">
                      Assigned to Route: {typeof cluster.route_id === 'object' ? cluster.route_id.name || 'Active Route' : 'Active Route'}
                    </p>
                  )}
                  {cluster.route_id && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Parent Node: <span className="font-semibold text-slate-700">{
                        cluster.parent_cluster 
                          ? (clusters.find(c => c._id.toString() === (cluster.parent_cluster?._id || cluster.parent_cluster).toString())?.name || 'HQ')
                          : 'HQ (Root)'
                      }</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-0.5">Radius: {radiusMeters / 1000}km threshold</p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Render Clinics (Color-coded by Route ID) */}
        {clinics.map((clinic: any) => {
          if (!clinic.lat || !clinic.lng) return null;
          const assignedCluster = clusters.find(c => c._id.toString() === (clinic.cluster_id || clinic.cluster_id?._id || '').toString());
          const routeId = getRouteId(assignedCluster);
          const markerColor = routeId ? routeMarkerMap[routeId] : 'blue';
          const iconToUse = clinicIcons[markerColor] || clinicIcons.blue;
          
          return (
            <Marker 
              key={clinic._id} 
              position={[clinic.lat, clinic.lng]}
              icon={iconToUse}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <Hospital className="w-4 h-4 text-blue-600" />
                    {clinic.name}
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2 text-slate-600 text-xs">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {assignedCluster ? assignedCluster.name : 'No Cluster'}
                    </p>
                    {assignedCluster && assignedCluster.route_id && (
                      <p className="flex items-center gap-2 text-slate-600 text-xs font-bold">
                        <Truck className="w-3.5 h-3.5 text-slate-400" />
                        On Route Style: <span className="capitalize">{markerColor}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-slate-600 text-xs">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {clinic.address}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Route Legend (Premium Glassmorphism Overlay) */}
      {routes.length > 0 && (
        <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md px-5 py-4 rounded-2xl shadow-2xl z-[1000] border border-slate-100/50 max-w-[280px] max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between gap-3 mb-3 border-b border-slate-100 pb-2">
            <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Routes Legend</h5>
            <button
              type="button"
              onClick={handleRecalculateRoutes}
              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[9px] font-black transition-all shrink-0 shadow-sm"
              title="Reset and Recalculate all routes from scratch"
            >
              🔄 Recalculate
            </button>
          </div>
          <div className="space-y-3 text-left">
            {routes.map((route: any, idx: number) => {
              const rootCluster = clusters.find(c => c._id.toString() === (route.root_cluster?._id || route.root_cluster || '').toString());
              const routeName = route.name || (rootCluster ? `Route via ${rootCluster.name}` : `Route ${route._id.toString().substring(18).toUpperCase()}`);
              const colorIdx = getRouteColorIndex(route._id.toString());
              const style = ROUTE_STYLES[colorIdx];
              
              return (
                <div key={route._id} className="flex items-start justify-between gap-4 group">
                  <div className="flex items-start gap-2.5">
                    <span 
                      className="w-3 h-3 rounded-full border-2 border-white shadow-sm mt-0.5 shrink-0" 
                      style={{ backgroundColor: style.color }}
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 leading-snug">
                        {routeName}
                      </span>
                      {rootCluster && (
                        <span className="text-[9px] text-slate-500 font-medium mt-0.5">
                          Base HQ → {rootCluster.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedRoute(route);
                      setEditRouteName(routeName);
                    }}
                    className="p-1 hover:bg-slate-100 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                    title="Edit/Stretch Route"
                  >
                    <Edit className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating Route Visual Editor Panel */}
      {selectedRoute && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl z-[1000] border border-slate-100/50 min-w-[340px] animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 tracking-wider">
                Route Editor
              </span>
              <h4 className="text-sm font-bold text-slate-800 mt-1">Rename Active Route</h4>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRoute(null);
              }}
              className="text-slate-400 hover:text-slate-550 transition-colors text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1 text-left">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Route Name</label>
              <input
                type="text"
                value={editRouteName}
                onChange={e => setEditRouteName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Route Name"
              />
            </div>

            {/* List and manage clusters belonging to this route */}
            <div className="space-y-1.5 text-left border-t border-slate-100 pt-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Clusters in this Route</label>
              <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1">
                {clusters.filter((c: any) => {
                  if (!selectedRoute) return false;
                  const rId = getRouteId(c);
                  return rId === selectedRoute._id.toString();
                }).length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">No clusters currently assigned to this route.</p>
                ) : (
                  clusters.filter((c: any) => {
                    if (!selectedRoute) return false;
                    const rId = getRouteId(c);
                    return rId === selectedRoute._id.toString();
                  }).map((cluster: any) => (
                    <div key={cluster._id} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-slate-700">{cluster.name}</span>
                        <span className="text-[9px] text-slate-400 capitalize">{cluster.type.toLowerCase()} cluster</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUnassignCluster(cluster._id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-extrabold transition-colors"
                          title="Unassign this cluster from the route"
                        >
                          Unassign
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCluster(cluster._id, cluster.name)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                          title="Permanently delete cluster from system"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveRouteChanges}
              disabled={saveLoading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-blue-100 disabled:opacity-50"
            >
              {saveLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Rename Route'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
