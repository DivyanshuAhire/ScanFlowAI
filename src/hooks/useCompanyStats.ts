'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export function useCompanyStats(companyId: string | null) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/company/stats?companyId=${companyId}`);
        setStats(response.data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [companyId]);

  return { stats, loading, error };
}
