/**
 * React Hook for Polymarket Monitor
 * Manages market data fetching, polling, and state
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MonitoredMarket,
  MONITORED_MARKETS,
  POLLING_INTERVAL
} from '../config/polymarketMonitor';
import {
  MarketData,
  Alert,
  NervEvent,
  monitorAllMarkets,
  loadAlerts
} from '../lib/polymarket-monitor';

export interface MonitorState {
  markets: MarketData[];
  alerts: Alert[];
  events: NervEvent[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface UsePolymarketMonitorReturn extends MonitorState {
  refresh: () => Promise<void>;
  toggleAutoRefresh: () => void;
  autoRefresh: boolean;
  getRecentAlerts: (minutes?: number) => Alert[];
}

export function usePolymarketMonitor(
  markets: MonitoredMarket[] = MONITORED_MARKETS
): UsePolymarketMonitorReturn {
  const [state, setState] = useState<MonitorState>({
    markets: [],
    alerts: [],
    events: [],
    loading: false,
    error: null,
    lastUpdated: null
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load
  useEffect(() => {
    // Load existing alerts from localStorage
    const storedAlerts = loadAlerts();
    setState(prev => ({ ...prev, alerts: storedAlerts }));
    
    // Initial fetch
    refresh();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Setup polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        refresh();
      }, POLLING_INTERVAL);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, markets]);

  // Refresh function
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await monitorAllMarkets(markets);
      
      setState({
        markets: result.markets,
        alerts: result.alerts,
        events: result.events,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
    } catch (err) {
      console.error('[usePolymarketMonitor] Refresh failed:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch market data'
      }));
    }
  }, [markets]);

  // Toggle auto-refresh
  const toggleAutoRefresh = useCallback(() => {
    setAutoRefresh(prev => !prev);
  }, []);

  // Get recent alerts
  const getRecentAlerts = useCallback((minutes: number = 60): Alert[] => {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return state.alerts.filter(alert => new Date(alert.timestamp) > cutoff);
  }, [state.alerts]);

  return {
    ...state,
    refresh,
    toggleAutoRefresh,
    autoRefresh,
    getRecentAlerts
  };
}
