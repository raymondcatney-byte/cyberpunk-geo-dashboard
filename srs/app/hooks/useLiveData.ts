import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSatellites, fetchEarthquakes } from '../lib/apis';
import type { Satellite, Earthquake } from '../lib/apis';

interface UseLiveDataOptions {
  satellitesEnabled?: boolean;
  earthquakesEnabled?: boolean;
  satellitesInterval?: number;
  earthquakesInterval?: number;
}

interface UseLiveDataReturn {
  satellites: Satellite[];
  earthquakes: Earthquake[];
  loading: {
    satellites: boolean;
    earthquakes: boolean;
  };
  errors: {
    satellites: string | null;
    earthquakes: string | null;
  };
  refresh: {
    satellites: () => void;
    earthquakes: () => void;
  };
}

export function useLiveData({
  satellitesEnabled = true,
  earthquakesEnabled = true,
  satellitesInterval = 60000,
  earthquakesInterval = 60000,
}: UseLiveDataOptions = {}): UseLiveDataReturn {
  const [satellites, setSatellites] = useState<Satellite[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);

  const [loading, setLoading] = useState({
    satellites: false,
    earthquakes: false,
  });

  const [errors, setErrors] = useState({
    satellites: null as string | null,
    earthquakes: null as string | null,
  });

  // Use refs to track intervals
  const satellitesTimer = useRef<NodeJS.Timeout | null>(null);
  const earthquakesTimer = useRef<NodeJS.Timeout | null>(null);

  const loadSatellites = useCallback(async () => {
    if (!satellitesEnabled) return;
    setLoading(prev => ({ ...prev, satellites: true }));
    try {
      const data = await fetchSatellites();
      setSatellites(data);
      setErrors(prev => ({ ...prev, satellites: null }));
    } catch (err) {
      setErrors(prev => ({ ...prev, satellites: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setLoading(prev => ({ ...prev, satellites: false }));
    }
  }, [satellitesEnabled]);

  const loadEarthquakes = useCallback(async () => {
    if (!earthquakesEnabled) return;
    setLoading(prev => ({ ...prev, earthquakes: true }));
    try {
      const data = await fetchEarthquakes();
      setEarthquakes(data);
      setErrors(prev => ({ ...prev, earthquakes: null }));
    } catch (err) {
      setErrors(prev => ({ ...prev, earthquakes: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setLoading(prev => ({ ...prev, earthquakes: false }));
    }
  }, [earthquakesEnabled]);

  // Setup polling
  useEffect(() => {
    if (satellitesEnabled) {
      loadSatellites();
      satellitesTimer.current = setInterval(loadSatellites, satellitesInterval);
    }
    return () => {
      if (satellitesTimer.current) clearInterval(satellitesTimer.current);
    };
  }, [satellitesEnabled, satellitesInterval, loadSatellites]);

  useEffect(() => {
    if (earthquakesEnabled) {
      loadEarthquakes();
      earthquakesTimer.current = setInterval(loadEarthquakes, earthquakesInterval);
    }
    return () => {
      if (earthquakesTimer.current) clearInterval(earthquakesTimer.current);
    };
  }, [earthquakesEnabled, earthquakesInterval, loadEarthquakes]);

  return {
    satellites,
    earthquakes,
    loading,
    errors,
    refresh: {
      satellites: loadSatellites,
      earthquakes: loadEarthquakes,
    },
  };
}
