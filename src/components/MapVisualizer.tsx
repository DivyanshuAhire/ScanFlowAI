'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Layers, Truck, MapPin, Loader2, Hospital, Home } from 'lucide-react';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const clinicIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const hqIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapVisualizer({ companyId }: { companyId: string }) {
  const [clinics, setClinics] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // We will fetch clinics, clusters, routes, companies, and cluster edges
        const [clinicsRes, clustersRes, routesRes, companiesRes] = await Promise.all([
          axios.get(`/api/clinics?companyId=${companyId}`),
          axios.get(`/api/clusters?companyId=${companyId}`),
          axios.get(`/api/routes?companyId=${companyId}`),
          axios.get('/api/companies'),
        ]);
        
        setClinics(clinicsRes.data);
        setClusters(clustersRes.data);
        setRoutes(routesRes.data);

        const currentCompany = companiesRes.data.find((c: any) => c._id === companyId);
        setCompany(currentCompany);

        // Fetch edges for graph visualization
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

    fetchData();
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center bg-slate-50 rounded-2xl border border-slate-200">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calculate default center (HQ Location takes precedence, then first clinic)
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

        {/* Render Cluster Edges (Graph Route Lines) */}
        {edges.map((edge: any) => {
          let startPos: [number, number] | null = null;
          let endPos: [number, number] | null = null;

          // Determine start position (HQ or Cluster A)
          if (edge.from_cluster.toString() === companyId.toString() && company && company.hqLocation) {
            startPos = [company.hqLocation.lat, company.hqLocation.lng];
          } else {
            const c1 = clusters.find(c => c._id.toString() === edge.from_cluster.toString());
            if (c1) startPos = [c1.center_lat, c1.center_lng];
          }

          // Determine end position (Cluster B)
          const c2 = clusters.find(c => c._id.toString() === edge.to_cluster.toString());
          if (c2) endPos = [c2.center_lat, c2.center_lng];

          if (startPos && endPos) {
            const pathPositions = edge.geometry && edge.geometry.length > 0 
              ? edge.geometry 
              : [startPos, endPos];
            
            return (
              <Polyline 
                key={edge._id} 
                positions={pathPositions}
                color={edge.from_cluster.toString() === companyId.toString() ? "#ef4444" : "#6366f1"} // Red from HQ, Indigo between clusters
                weight={edge.from_cluster.toString() === companyId.toString() ? 5 : 4}
                opacity={0.8}
                dashArray={edge.geometry ? undefined : "5, 10"}
              />
            );
          }
          return null;
        })}

        {/* Render Cluster Centroids (using Circle for fixed geographical scale) */}
        {clusters.map((cluster: any) => {
          if (!cluster.center_lat || !cluster.center_lng) return null;
          // Set circle radius based on 2km (primary) or 1km (subcluster) geographical bounds in meters
          const radiusMeters = cluster.type === 'PRIMARY' ? 2000 : 1000;
          return (
            <Circle
              key={cluster._id}
              center={[cluster.center_lat, cluster.center_lng]}
              radius={radiusMeters}
              pathOptions={{
                color: cluster.type === 'PRIMARY' ? '#3b82f6' : cluster.type === 'SUBCLUSTER' ? '#10b981' : '#f59e0b',
                fillColor: cluster.type === 'PRIMARY' ? '#3b82f6' : cluster.type === 'SUBCLUSTER' ? '#10b981' : '#f59e0b',
                fillOpacity: 0.1,
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
                  <p className="text-[10px] text-slate-400 mt-0.5">Radius: {radiusMeters / 1000}km threshold</p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* Render Clinics */}
        {clinics.map((clinic: any) => {
          if (!clinic.lat || !clinic.lng) return null;
          const assignedCluster = clusters.find(c => c._id.toString() === (clinic.cluster_id || clinic.cluster_id?._id || '').toString());
          
          return (
            <Marker 
              key={clinic._id} 
              position={[clinic.lat, clinic.lng]}
              icon={clinicIcon}
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
    </div>
  );
}
