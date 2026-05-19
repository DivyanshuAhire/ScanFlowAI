'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';

interface ScanFlowMapProps {
  showRoutes?: boolean;
  showClusters?: boolean;
  showClinics?: boolean;
  showHQ?: boolean;
  interactive?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  highlightClusterId?: string;
  selectedRouteId?: string | null;
  hqLocation?: { lat: number; lng: number } | null;
  routesData?: any[];
  clustersData?: any[];
  clinicsData?: any[];
}

// ----------------------------------------------------
// Custom SVG DivIcons to solve Next.js bundling issues
// ----------------------------------------------------

// 1. HQ Marker (Star)
const createHQIcon = () => L.divIcon({
  className: 'custom-hq-marker',
  html: `
    <div style="display: flex; justify-content: center; align-items: center; width: 36px; height: 36px; background: #0f172a; border: 3px solid #0ea5e9; border-radius: 50%; box-shadow: 0 0 10px rgba(14,165,233,0.5); transform: translateY(-5px);">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#0ea5e9" stroke="none">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// 2. Clinic Pin
const createClinicIcon = (color: string = '#64748b', opacity: number = 1.0) => L.divIcon({
  className: 'custom-clinic-marker',
  html: `
    <div style="display: flex; justify-content: center; align-items: center; width: 22px; height: 22px; background: white; border: 2.5px solid ${color}; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.15); transform: translateY(-2px); opacity: ${opacity}; transition: opacity 0.2s;">
      <div style="width: 7px; height: 7px; background: ${color}; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// 3. Cluster Centroid
const createClusterIcon = (color: string = '#3b82f6', isShared: boolean = false, routeColors: string[] = [], opacity: number = 1.0) => {
  if (isShared && routeColors.length >= 2) {
    // Concentric dual-color ring for shared hubs
    return L.divIcon({
      className: 'custom-cluster-marker-shared',
      html: `
        <div style="display: flex; justify-content: center; align-items: center; width: 34px; height: 34px; background: white; border: 3.5px double ${routeColors[0]}; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.25); outline: 3px solid ${routeColors[1]}; transform: translateY(-5px); opacity: ${opacity}; transition: opacity 0.2s;">
          <span style="font-size: 9px; font-weight: 800; color: #1e293b;">HUB</span>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `
      <div style="display: flex; justify-content: center; align-items: center; width: 28px; height: 28px; background: white; border: 3.5px solid ${color}; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.2); transform: translateY(-4px); opacity: ${opacity}; transition: opacity 0.2s;">
        <div style="width: 8px; height: 8px; background: ${color}; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// 4. Click Pin Drop Indicator
const createDropIcon = () => L.divIcon({
  className: 'custom-drop-marker',
  html: `
    <div style="display: flex; justify-content: center; align-items: center; width: 26px; height: 26px; background: #ef4444; border: 2.5px solid white; border-radius: 50%; box-shadow: 0 4px 12px rgba(239,68,68,0.4); animation: bounce 1s infinite alternate; transform: translateY(-8px);">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"></path>
      </svg>
    </div>
    <style>
      @keyframes bounce {
        from { transform: translateY(-5px); }
        to { transform: translateY(-11px); }
      }
    </style>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Map events handler to intercept map clicks
function MapEvents({ interactive, onMapClick, setClickedPos }: { 
  interactive: boolean; 
  onMapClick?: (lat: number, lng: number) => void;
  setClickedPos: (pos: [number, number] | null) => void;
}) {
  useMapEvents({
    click(e) {
      if (!interactive) return;
      const { lat, lng } = e.latlng;
      setClickedPos([lat, lng]);
      if (onMapClick) {
        onMapClick(lat, lng);
      }
    },
  });
  return null;
}

export default function ScanFlowMap({
  showRoutes = true,
  showClusters = true,
  showClinics = true,
  showHQ = true,
  interactive = false,
  onMapClick,
  highlightClusterId,
  selectedRouteId,
  hqLocation,
  routesData = [],
  clustersData = [],
  clinicsData = []
}: ScanFlowMapProps) {
  const [clickedPos, setClickedPos] = useState<[number, number] | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-slate-100/50 rounded-2xl gap-2 border border-slate-200/50">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
        <span className="text-xs font-semibold text-slate-400">Loading map engine...</span>
      </div>
    );
  }

  // Calculate default map center
  const centerLat = hqLocation?.lat ?? 20.5937;
  const centerLng = hqLocation?.lng ?? 78.9629;
  const defaultZoom = hqLocation ? 12 : 5;

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Click events handler for interactive mode */}
        <MapEvents interactive={interactive} onMapClick={onMapClick} setClickedPos={setClickedPos} />

        {/* HQ Marker */}
        {showHQ && hqLocation && (
          <Marker position={[hqLocation.lat, hqLocation.lng]} icon={createHQIcon()}>
            <Popup className="custom-popup">
              <div className="p-1 font-sans text-xs">
                <p className="font-extrabold text-slate-800 uppercase tracking-wide">Company Dispatch HQ</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Coordinates: {hqLocation.lat.toFixed(5)}, {hqLocation.lng.toFixed(5)}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Temporary Click Dropped Pin Marker */}
        {interactive && clickedPos && (
          <Marker position={clickedPos} icon={createDropIcon()}>
            <Popup>
              <div className="p-1 font-sans text-xs text-center">
                <p className="font-bold text-red-600">Selected Node</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Ready for selection</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route Polylines */}
        {showRoutes && routesData.map((route) => {
          if (!route.pathGeoJSON?.coordinates) return null;
          // Leaflet expects coordinates in [lat, lng] format, GeoJSON stores in [lng, lat]
          const positions = route.pathGeoJSON.coordinates.map((c: number[]) => [c[1], c[0]]);
          
          const isSelected = selectedRouteId === route._id;
          const isAnyRouteSelected = !!selectedRouteId;
          const opacity = isAnyRouteSelected ? (isSelected ? 1.0 : 0.12) : 0.85;
          const weight = isAnyRouteSelected ? (isSelected ? 8 : 2) : 5;

          return (
            <Polyline
              key={route._id}
              positions={positions}
              pathOptions={{
                color: route.color || '#3b82f6',
                weight,
                opacity,
                lineJoin: 'round'
              }}
            />
          );
        })}

        {/* Cluster Centroids + Coverage Circles */}
        {showClusters && clustersData.map((cluster) => {
          const isHighlighted = highlightClusterId === cluster._id;
          
          // Find route color
          let clusterColor = '#64748b'; // default grey
          const relatedRouteColors: string[] = [];

          if (cluster.routeIds && cluster.routeIds.length > 0) {
            for (const rId of cluster.routeIds) {
              const matchedRoute = routesData.find(r => r._id === rId || r._id === rId._id);
              if (matchedRoute) {
                relatedRouteColors.push(matchedRoute.color);
              }
            }
            if (relatedRouteColors.length > 0) {
              clusterColor = relatedRouteColors[0];
            }
          }

          const isClusterInSelectedRoute = selectedRouteId
            ? (cluster.routeIds && cluster.routeIds.some((rId: any) => (rId._id || rId).toString() === selectedRouteId))
            : false;
          const isAnyRouteSelected = !!selectedRouteId;
          const clusterOpacity = isAnyRouteSelected ? (isClusterInSelectedRoute ? 1.0 : 0.15) : 1.0;
          const circleOpacity = isAnyRouteSelected ? (isClusterInSelectedRoute ? 0.25 : 0.02) : (isHighlighted ? 0.25 : 0.08);
          const circleWeight = isAnyRouteSelected ? (isClusterInSelectedRoute ? 2.5 : 0.5) : (isHighlighted ? 2.5 : 1);

          return (
            <div key={cluster._id}>
              {/* Centroid Marker */}
              <Marker 
                position={[cluster.centroidLat, cluster.centroidLng]} 
                icon={createClusterIcon(clusterColor, cluster.isSharedHub, relatedRouteColors, clusterOpacity)}
              >
                <Popup>
                  <div className="p-1 font-sans text-xs">
                    <p className="font-extrabold text-slate-800">Cluster: {cluster.name}</p>
                    <p className="text-[10px] text-slate-400">HQ Distance: {cluster.distanceFromHqKm?.toFixed(1) || 'N/A'} km</p>
                    <p className="text-[10px] text-slate-400">Order on Route: #{cluster.routeOrderIndex || 'N/A'}</p>
                    {cluster.isSharedHub && <p className="text-[10px] text-amber-600 font-semibold mt-0.5">⚠️ SHARED ROUTE HUB</p>}
                  </div>
                </Popup>
              </Marker>

              {/* Coverage Circle (5km) */}
              <Circle
                center={[cluster.centroidLat, cluster.centroidLng]}
                radius={cluster.radiusKm * 1000} // meters
                pathOptions={{
                  fillColor: clusterColor,
                  fillOpacity: circleOpacity,
                  color: clusterColor,
                  weight: circleWeight,
                  dashArray: cluster.parentCluster ? '5, 5' : undefined
                }}
              />
            </div>
          );
        })}

        {/* Clinic Pins */}
        {showClinics && clinicsData.map((clinic) => {
          // Resolve clinic's cluster to color
          let clinicColor = '#64748b';
          const matchedCluster = clustersData.find(c => c._id === clinic.clusterId || c._id === clinic.clusterId?._id);

          if (matchedCluster && matchedCluster.routeIds && matchedCluster.routeIds.length > 0) {
            const firstRouteId = matchedCluster.routeIds[0];
            const matchedRoute = routesData.find(r => r._id === firstRouteId || r._id === firstRouteId._id);
            if (matchedRoute) {
              clinicColor = matchedRoute.color;
            }
          }

          const isClinicInSelectedRoute = selectedRouteId && matchedCluster
            ? (matchedCluster.routeIds && matchedCluster.routeIds.some((rId: any) => (rId._id || rId).toString() === selectedRouteId))
            : false;
          const isAnyRouteSelected = !!selectedRouteId;
          const clinicOpacity = isAnyRouteSelected ? (isClinicInSelectedRoute ? 1.0 : 0.15) : 1.0;

          return (
            <Marker
              key={clinic._id}
              position={[clinic.lat, clinic.lng]}
              icon={createClinicIcon(clinicColor, clinicOpacity)}
            >
              <Popup>
                <div className="p-1 font-sans text-xs">
                  <p className="font-extrabold text-slate-800">{clinic.name}</p>
                  <p className="text-[10px] text-slate-400">📞 Phone: {clinic.phone}</p>
                  {clinic.address && <p className="text-[10px] text-slate-500 mt-1 max-w-[150px]">📍 {clinic.address}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
