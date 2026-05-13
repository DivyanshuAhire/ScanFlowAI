'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export function useAppointments(companyId: string | null) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/appointments?companyId=${companyId}`);
        setAppointments(response.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [companyId]);

  return { appointments, loading, error, setAppointments };
}
