import { useState, useEffect } from 'react';
import { getLogEntries } from '../services/api';

export function useLogEntries(params?: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getLogEntries(params);
        setData(result);
        setError(null);
      } catch (err) {
        setError('Failed to load log entries');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

