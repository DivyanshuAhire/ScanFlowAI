'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export function useClinicAppointments(clinicId: string | null) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = async () => {
    if (!clinicId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/appointments/clinic?clinicId=${clinicId}`);
      setAppointments(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [clinicId]);

  return { appointments, loading, error, fetchAppointments };
}
