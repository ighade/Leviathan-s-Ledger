import { useState, useEffect } from 'react';
import { getWhaleSightings, WhaleSighting } from '../services/api';

export function useWhaleSightings(params?: any) {
  const [data, setData] = useState<WhaleSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await getWhaleSightings(params);
        setData(result);
        setError(null);
      } catch (err) {
        setError('Failed to load whale sightings');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

