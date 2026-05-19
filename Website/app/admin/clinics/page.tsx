'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { 
  Building, 
  Plus, 
  MapPin, 
  Trash2, 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Loader2, 
  X,
  Map,
  Eye
} from 'lucide-react';

const ScanFlowMap = dynamic(
  () => import('@/components/map/ScanFlowMap'),
  { ssr: false }
);

interface Clinic {
  _id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  loginEnabled: boolean;
  address?: string;
  clusterId?: {
    _id: string;
    name: string;
    routeIds?: string[];
  };
}

export default function AdminClinicsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [hq, setHq] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClinicName, setNewClinicName] = useState('');
  const [newClinicPhone, setNewClinicPhone] = useState('');
  const [newClinicAddress, setNewClinicAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Credentials Modal States
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<{ email: string; password: string } | null>(null);
  const [credsClinicName, setCredsClinicName] = useState('');

  // Map Highlights
  const [highlightClusterId, setHighlightClusterId] = useState<string | undefined>(undefined);

  async function fetchClinicsAndHQ() {
    try {
      const res = await fetch('/api/clinics');
      const data = await res.json();
      setClinics(data.clinics || []);

      // Deduce HQ from routes
      const routesRes = await fetch('/api/routes');
      const routesData = await routesRes.json();
      if (routesData.routes && routesData.routes.length > 0) {
        const firstCoord = routesData.routes[0].pathGeoJSON?.coordinates?.[0];
        if (firstCoord) {
          setHq({ lat: firstCoord[1], lng: firstCoord[0] });
        }
      }
    } catch (e) {
      console.error('Error fetching clinics:', e);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchClinicsAndHQ();
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    toast.info(`Captured coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoords) {
      toast.error('Please drop a pin on the map to set the clinic location.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Adding clinic & calculating route overlap...');

    try {
      const res = await fetch('/api/clinics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClinicName,
          phone: newClinicPhone,
          address: newClinicAddress,
          lat: selectedCoords.lat,
          lng: selectedCoords.lng
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add clinic');
      }

      toast.success('Clinic added successfully! Auto-cluster generated.', { id: toastId });
      
      // Reset Form & reload
      setNewClinicName('');
      setNewClinicPhone('');
      setNewClinicAddress('');
      setSelectedCoords(null);
      setShowAddModal(false);
      
      setIsLoading(true);
      await fetchClinicsAndHQ();
    } catch (error: any) {
      toast.error(error.message || 'Error occurred', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLogin = async (clinicId: string, currentStatus: boolean, clinicName: string) => {
    const nextStatus = !currentStatus;
    const toastId = toast.loading(`${nextStatus ? 'Enabling' : 'Disabling'} clinic operator login...`);

    try {
      const res = await fetch(`/api/admin/clinic-login/${clinicId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: nextStatus })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      toast.success(`Operator login ${nextStatus ? 'enabled' : 'disabled'} successfully!`, { id: toastId });
      
      if (nextStatus && data.generatedCreds) {
        setGeneratedCreds(data.generatedCreds);
        setCredsClinicName(clinicName);
        setShowCredsModal(true);
      }

      // Reload list
      await fetchClinicsAndHQ();
    } catch (error: any) {
      toast.error(error.message || 'Failed to toggle login', { id: toastId });
    }
  };

  const handleDeleteClinic = async (clinicId: string) => {
    if (!confirm('Are you sure you want to delete this clinic? This will force route recalculations.')) return;

    const toastId = toast.loading('Deleting clinic & updating routes...');
    try {
      const res = await fetch(`/api/clinics/${clinicId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete clinic');
      }

      toast.success('Clinic deleted successfully!', { id: toastId });
      setIsLoading(true);
      await fetchClinicsAndHQ();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed', { id: toastId });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="h-7 w-7 text-accent" /> Clinics Node Panel
          </h1>
          <p className="text-slate-500 text-sm mt-1">Add clinics, enable operator logins, and audit cluster assignments.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-5 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-[0.99] cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Dental Clinic
        </button>
      </div>

      {/* Main Clinics Grid List */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
          <span className="text-sm font-semibold text-slate-500">Retrieving Clinics...</span>
        </div>
      ) : clinics.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <Building className="h-12 w-12 text-slate-300 mx-auto" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg">No Clinics Added</h3>
            <p className="text-slate-400 text-xs mt-1">Please add a clinic to get started with appointment booking and routing.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Clinic Details</th>
                  <th className="py-4 px-6">Phone Number</th>
                  <th className="py-4 px-6">Coordinates</th>
                  <th className="py-4 px-6">Cluster Centroid</th>
                  <th className="py-4 px-6 text-center">Login Access</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {clinics.map((clinic) => (
                  <tr key={clinic._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4.5 px-6">
                      <span className="font-extrabold text-slate-900 text-sm block">{clinic.name}</span>
                      <span className="text-slate-400 text-[10px] block mt-0.5">{clinic.address || 'No Address Provided'}</span>
                    </td>
                    <td className="py-4.5 px-6 font-mono">{clinic.phone}</td>
                    <td className="py-4.5 px-6 font-mono text-[10px] text-slate-400">
                      {clinic.lat.toFixed(5)}, {clinic.lng.toFixed(5)}
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold border border-slate-200">
                        {clinic.clusterId?.name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-4.5 px-6 text-center">
                      <button
                        onClick={() => handleToggleLogin(clinic._id, clinic.loginEnabled, clinic.name)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-all border ${
                          clinic.loginEnabled 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100/50'
                        }`}
                      >
                        {clinic.loginEnabled ? (
                          <>
                            <ShieldCheck className="h-3 w-3" /> Enabled
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="h-3 w-3" /> Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4.5 px-6 text-right space-x-1">
                      <button
                        onClick={() => handleDeleteClinic(clinic._id)}
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                        title="Delete Clinic"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 1. Add Clinic Slide-over / Modal (Stunning Split layout) */}
      {/* -------------------------------------------------- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl border border-slate-100 animate-scale-up">
            
            {/* Form Side */}
            <form onSubmit={handleAddClinic} className="w-full md:w-2/5 p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-100 shrink-0">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Add Dental Clinic</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Clinic Name</label>
                    <input 
                      type="text" 
                      required 
                      value={newClinicName}
                      onChange={(e) => setNewClinicName(e.target.value)}
                      placeholder="e.g. Smile Dental Care" 
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                    <input 
                      type="tel" 
                      required 
                      value={newClinicPhone}
                      onChange={(e) => setNewClinicPhone(e.target.value)}
                      placeholder="e.g. 9876543210" 
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Address</label>
                    <textarea 
                      required 
                      rows={3}
                      value={newClinicAddress}
                      onChange={(e) => setNewClinicAddress(e.target.value)}
                      placeholder="e.g. 102, Park Avenue road, Sector 5..." 
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent text-slate-800 resize-none"
                    />
                  </div>

                  <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl space-y-1">
                    <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">Calibrate Coordinates</span>
                    <p className="text-[10px] text-sky-700 leading-normal">
                      Click anywhere on the map panel to drop the red locator pin. Coordinates will lock in automatically.
                    </p>
                    {selectedCoords ? (
                      <span className="inline-block mt-2 font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                        Locked: {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                      </span>
                    ) : (
                      <span className="inline-block mt-2 font-mono text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                        Coordinates: NOT SET
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCoords}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center"
                >
                  {isSubmitting ? 'Adding...' : 'Save Clinic'}
                </button>
              </div>
            </form>

            {/* Map Side */}
            <div className="flex-1 bg-slate-100 relative h-1/2 md:h-full">
              <ScanFlowMap
                showRoutes={true}
                showClusters={true}
                showClinics={true}
                showHQ={true}
                interactive={true}
                onMapClick={handleMapClick}
                hqLocation={hq}
              />
              <div className="absolute top-4 left-4 bg-slate-950/80 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full z-[1000] backdrop-blur flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-red-500 animate-pulse" />
                <span>Interact Map Mode Enabled</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------- */}
      {/* 2. Credentials Modal (Shows only once!) */}
      {/* -------------------------------------------------- */}
      {showCredsModal && generatedCreds && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 border border-slate-100 shadow-2xl space-y-6 animate-scale-up">
            
            <div className="space-y-2 text-center">
              <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-sm">
                <Key className="h-5 w-5 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Credentials Generated</h3>
              <p className="text-slate-500 text-xs">
                Credentials for <span className="font-semibold text-slate-800">{credsClinicName}</span>. Copy these now. Password is shown only once!
              </p>
            </div>

            <div className="space-y-3 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-semibold font-mono">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operator Email:</span>
                <span className="text-slate-800 select-all block">{generatedCreds.email}</span>
              </div>
              <div className="space-y-1 border-t border-slate-200/50 pt-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operator Password:</span>
                <span className="text-slate-800 select-all block text-sm font-bold bg-amber-100 border border-amber-200 px-2 py-1 rounded inline-block">
                  {generatedCreds.password}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowCredsModal(false);
                setGeneratedCreds(null);
              }}
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg transition-all active:scale-[0.99] text-xs cursor-pointer text-center"
            >
              I Have Saved the Credentials
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
