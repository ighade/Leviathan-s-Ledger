import { useState, useEffect } from 'react';
import { getStatistics, Statistics } from '../services/api';

export function useStatistics() {
  const [data, setData] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getStatistics();
        setData(result);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.error || err?.response?.data?.details || err?.message || 'Failed to load statistics';
        setError(errorMessage);
        console.error('Statistics error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}

