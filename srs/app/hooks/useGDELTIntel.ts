/**
 * useGDELTIntel Hook - Makaveli Intelligence Data
 * Real-time event monitoring from GDELT for conflict, protest, crisis data
 */

import { useState, useCallback, useEffect, useRef } from 'react';

export interface GDELTEvent {
  id: string;
  location: {
    lat?: number;
    lng?: number;
    country?: string;
  };
  title: string;
  summary: string;
  theme: string;
  source: string;
  timestamp: string;
  tone?: number; // Sentiment score
}

export interface GDELTResponse {
  ok: boolean;
  meta: {
    theme?: string;
    country?: string;
    hours: number;
    total: number;
    returned: number;
  };
  events: GDELTEvent[];
}

export interface UseGDELTIntelReturn {
  events: GDELTEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

interface UseGDELTIntelOptions {
  theme?: string;
  country?: string;
  hours?: number;
  enabled?: boolean;
  refreshInterval?: number; // milliseconds
}

export function useGDELTIntel(options: UseGDELTIntelOptions = {}): UseGDELTIntelReturn {
  const {
    theme,
    country,
    hours = 24,
    enabled = true,
    refreshInterval = 5 * 60 * 1000, // 5 minutes
  } = options;

  const [events, setEvents] = useState<GDELTEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (theme) params.set('theme', theme);
      if (country) params.set('country', country);
      params.set('hours', hours.toString());

      const response = await fetch(`/api/intel-feeds?feed=gdelt&${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: GDELTResponse = await response.json();
      
      if (data.ok) {
        setEvents(data.events);
        setLastUpdated(new Date());
      } else {
        throw new Error('Invalid response from GDELT');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch GDELT data');
    } finally {
      setLoading(false);
    }
  }, [theme, country, hours, enabled]);

  // Initial fetch and interval setup
  useEffect(() => {
    if (enabled) {
      void fetchEvents();
      
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(fetchEvents, refreshInterval);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshInterval, fetchEvents]);

  return {
    events,
    loading,
    error,
    refresh: fetchEvents,
    lastUpdated,
  };
}
