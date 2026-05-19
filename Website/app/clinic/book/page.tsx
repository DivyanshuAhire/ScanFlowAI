'use client';

import BookingWizard from '@/components/booking/BookingWizard';

export default function ClinicBookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Request Scan Appointment</h1>
        <p className="text-slate-500 text-sm mt-1">Book diagnostic dental scans for your clinic operators with real-time routing check.</p>
      </div>
      <BookingWizard />
    </div>
  );
}
