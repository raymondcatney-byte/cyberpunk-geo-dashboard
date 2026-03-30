import { useState, useCallback } from 'react';

export interface Anomaly {
  id: string;
  sector: string;
  title: string;
  slug: string;
  score: number;
  price: number;
  volume: number;
  volumeZ: number;
  priceChange1h: number;
  priceChange24h: number;
  signals: string[];
  url: string;
  timestamp: string;
}

interface AnomaliesResponse {
  ok: boolean;
  anomalies?: Anomaly[];
  count?: number;
  scanned?: number;
  timestamp?: string;
  error?: string;
}

export function useAnomalies() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);

  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/anomalies', {
        headers: { Accept: 'application/json' }
      });
      
      const data: AnomaliesResponse = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Failed to fetch anomalies');
      }
      
      setAnomalies(data.anomalies || []);
      setLastScan(data.timestamp || new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAnomalies = useCallback(() => {
    setAnomalies([]);
    setError(null);
    setLastScan(null);
  }, []);

  return {
    anomalies,
    loading,
    error,
    lastScan,
    fetchAnomalies,
    clearAnomalies
  };
}
