'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Map, MapPin, Layers, RefreshCw, Star, Info, HelpCircle, Loader2 } from 'lucide-react';

// Import Leaflet Map dynamically with SSR disabled to prevent Node window crashes
const ScanFlowMap = dynamic(
  () => import('@/components/map/ScanFlowMap'),
  { ssr: false }
);

export default function AdminMapPage() {
  const [hq, setHq] = useState<{ lat: number; lng: number } | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);

  const [isHqMode, setIsHqMode] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Layers Toggles
  const [showRoutes, setShowRoutes] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [showClinics, setShowClinics] = useState(true);

  async function fetchSpatialData() {
    try {
      const [clinicsRes, routesRes, clustersRes] = await Promise.all([
        fetch('/api/clinics'),
        fetch('/api/routes'),
        fetch('/api/clusters')
      ]);

      const clinicsData = await clinicsRes.json();
      const routesData = await routesRes.json();
      const clustersData = await clustersRes.json();

      setClinics(clinicsData.clinics || []);
      setRoutes(routesData.routes || []);
      setClusters(clustersData.clusters || []);

      // Derive HQ from the first route or fetch it from a hypothetical HQ endpoint if exists,
      // actually let's check routes or clusters centroid, but we wrote an HQ endpoint:
      // We can also infer HQ because if we have routes, the first point of the route polyline path is the HQ!
      // Wait, let's just make a fast API fetch for HQ since we have a CompanyHQ model.
      // Wait! We didn't define a GET endpoint for HQ in Section 10, only a POST.
      // Let's create a quick API GET handler for HQ or infer it.
      // But wait! It is extremely easy to write a quick GET /api/admin/hq or we can just fetch it directly.
      // Let's inspect: since all routes start from HQ, we can extract the first coordinate of any route's pathGeoJSON as the HQ location!
      // This is extremely clever. If routes exist:
      if (routesData.routes && routesData.routes.length > 0) {
        const firstRoute = routesData.routes[0];
        if (firstRoute.pathGeoJSON?.coordinates && firstRoute.pathGeoJSON.coordinates.length > 0) {
          const firstCoord = firstRoute.pathGeoJSON.coordinates[0];
          setHq({ lat: firstCoord[1], lng: firstCoord[0] });
        }
      }
    } catch (e) {
      console.error('Error loading map details:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchSpatialData();
  }, []);

  const handleMapClick = async (lat: number, lng: number) => {
    if (!isHqMode) return;

    const toastId = toast.loading('Setting Company Dispatch HQ...');
    try {
      const res = await fetch('/api/admin/hq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save HQ');
      }

      setHq({ lat, lng });
      setIsHqMode(false);
      toast.success('HQ coordinates updated successfully!', { id: toastId });
      
      // Re-fetch all data because HQ change auto-regenerates routes
      setIsLoading(true);
      await fetchSpatialData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update HQ', { id: toastId });
    }
  };

  const handleRegenerateRoutes = async () => {
    setIsRegenerating(true);
    const toastId = toast.loading('Re-running clustering and overlap algorithm...');
    try {
      const res = await fetch('/api/admin/regenerate-routes', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Regeneration failed');
      }

      toast.success('Routes and cluster layers regenerated successfully!', { id: toastId });
      
      // Re-fetch everything
      await fetchSpatialData();
    } catch (error: any) {
      toast.error(error.message || 'Route regeneration failed', { id: toastId });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 relative animate-fade-in">
      
      {/* Sidebar Controls Panel */}
      <div className="w-full md:w-80 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between gap-6 shrink-0 h-auto md:h-full overflow-y-auto">
        <div className="space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Map className="h-5 w-5 text-accent" /> Spatial layers
            </h1>
            <p className="text-slate-500 text-xs">Auditing and configuring ScanFlow route matrices.</p>
          </div>

          {/* Action Trigger Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => setIsHqMode(!isHqMode)}
              className={`w-full py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer ${
                isHqMode 
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="h-4 w-4" />
              {isHqMode ? 'Click Map to Set HQ...' : 'Set Company HQ'}
            </button>
            
            <button
              onClick={handleRegenerateRoutes}
              disabled={isRegenerating || !hq}
              className="w-full py-3 px-4 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
              Regenerate Routes
            </button>
          </div>

          {/* Layer View Toggles */}
          <div className="space-y-3 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Layer visibility
            </h3>
            
            <div className="space-y-2 text-xs font-medium text-slate-700">
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showRoutes} 
                  onChange={(e) => setShowRoutes(e.target.checked)} 
                  className="rounded text-accent focus:ring-accent accent-slate-900"
                />
                <span>Route Polylines ({routes.length})</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showClusters} 
                  onChange={(e) => setShowClusters(e.target.checked)} 
                  className="rounded text-accent focus:ring-accent accent-slate-900"
                />
                <span>Cluster Centroids ({clusters.length})</span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showClinics} 
                  onChange={(e) => setShowClinics(e.target.checked)} 
                  className="rounded text-accent focus:ring-accent accent-slate-900"
                />
                <span>Clinic Pins ({clinics.length})</span>
              </label>
            </div>
          </div>
        </div>

        {/* Informative Legend Alert Box */}
        <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl flex gap-3 text-[11px] text-sky-800 leading-relaxed shadow-sm">
          <Info className="h-5 w-5 text-sky-500 shrink-0" />
          <div className="space-y-1">
            <span className="font-extrabold uppercase tracking-wide block">Map Instructions</span>
            <p>1. Ensure you click <span className="font-semibold">Set HQ</span> first and drop a pin to calibrate the route engine.</p>
            <p className="mt-1">2. Circular rings represent <span className="font-semibold">5km cluster centroids</span>, concentric dual rings are <span className="font-semibold">shared hubs</span>.</p>
          </div>
        </div>
      </div>

      {/* Main Full-Screen Map Container */}
      <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-3 shadow-sm h-full overflow-hidden relative min-h-[300px]">
        {isLoading ? (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
            <span className="text-sm font-semibold text-slate-500">Retrieving Spatial Layers...</span>
          </div>
        ) : null}

        <ScanFlowMap
          showRoutes={showRoutes}
          showClusters={showClusters}
          showClinics={showClinics}
          showHQ={!!hq}
          interactive={isHqMode}
          onMapClick={handleMapClick}
          hqLocation={hq}
          routesData={routes}
          clustersData={clusters}
          clinicsData={clinics}
        />
      </div>

    </div>
  );
}
