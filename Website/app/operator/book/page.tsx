'use client';

import BookingWizard from '@/components/booking/BookingWizard';

export default function OperatorBookPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Book Scan Appointment</h1>
        <p className="text-slate-500 text-sm mt-1">Book dental scans for partnered clinics with automatic spatial efficiency calculations.</p>
      </div>
      <BookingWizard />
    </div>
  );
}
