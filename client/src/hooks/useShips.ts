import { useState, useEffect } from "react";
import { getShips, Ship } from "../services/api";

export function useShips() {
  const [data, setData] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const ships = await getShips();
        setData(ships);
        setError(null);
      } catch (err) {
        setError("Failed to load ships");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
}
