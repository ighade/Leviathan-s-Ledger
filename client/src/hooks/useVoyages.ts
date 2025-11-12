import { useState, useEffect } from 'react';
import { getVoyages, Voyage } from '../services/api';

export function useVoyages(shipId?: number) {
  const [data, setData] = useState<Voyage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const voyages = await getVoyages(shipId ? { shipId } : undefined);
        setData(voyages);
        setError(null);
      } catch (err) {
        setError('Failed to load voyages');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shipId]);

  return { data, loading, error };
}

