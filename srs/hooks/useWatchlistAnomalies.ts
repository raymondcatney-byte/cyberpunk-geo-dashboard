/**
 * useWatchlistAnomalies Hook
 * Manages anomaly detection for the 22 watchlist markets
 * Zero-cost: uses localStorage and existing API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MarketSnapshot,
  AnomalyResult,
  ArbitrageAnomaly,
  scanForAnomalies,
  recordSnapshot,
  loadSnapshots,
} from '../lib/watchlist-anomalies';

interface UseWatchlistAnomaliesReturn {
  marketAnomalies: AnomalyResult[];
  arbitrageAnomalies: ArbitrageAnomaly[];
  totalAnomalies: number;
  criticalCount: number;
  lastScanTime: Date | null;
  isScanning: boolean;
  scanNow: () => Promise<void>;
  snapshotCount: number;
}

const SCAN_INTERVAL = 60000; // 60 seconds

export function useWatchlistAnomalies(): UseWatchlistAnomaliesReturn {
  const [marketAnomalies, setMarketAnomalies] = useState<AnomalyResult[]>([]);
  const [arbitrageAnomalies, setArbitrageAnomalies] = useState<ArbitrageAnomaly[]>([]);
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(0);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  /**
   * Fetch current watchlist data and scan for anomalies
   */
  const scanNow = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    try {
      // Fetch current watchlist data
      const response = await fetch('/api/polymarket?type=watchlist');
      if (!response.ok) throw new Error('Failed to fetch watchlist');
      
      const data = await response.json();
      if (!data.ok || !data.markets) return;
      
      // Convert to MarketSnapshot format
      const currentMarkets: MarketSnapshot[] = data.markets.map((m: any) => ({
        slug: m.slug || m.eventSlug || '',
        yesPrice: m.yesPrice || m.outcomePrices?.[0] || 0,
        volume: m.volume || 0,
        liquidity: m.liquidity || 0,
        spread: Math.abs((m.spread || 0)),
        timestamp: Date.now(),
      })).filter((m: MarketSnapshot) => m.slug);
      
      // Scan for anomalies
      const results = scanForAnomalies(currentMarkets);
      
      setMarketAnomalies(results.marketAnomalies);
      setArbitrageAnomalies(results.arbitrageAnomalies);
      setTotalAnomalies(results.totalAnomalies);
      setCriticalCount(results.criticalCount);
      setLastScanTime(new Date());
      
      // Record snapshot for next comparison
      recordSnapshot(currentMarkets);
      setSnapshotCount(loadSnapshots().length);
      
    } catch (error) {
      console.error('[useWatchlistAnomalies] Scan failed:', error);
    } finally {
      setIsScanning(false);
    }
  }, [isScanning]);

  /**
   * Handle visibility change (pause when tab hidden)
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  /**
   * Initial scan and interval setup
   */
  useEffect(() => {
    // Initial scan
    scanNow();
    
    // Set up interval (only scan when visible)
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        scanNow();
      }
    }, SCAN_INTERVAL);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [scanNow]);

  // Load initial snapshot count
  useEffect(() => {
    setSnapshotCount(loadSnapshots().length);
  }, []);

  return {
    marketAnomalies,
    arbitrageAnomalies,
    totalAnomalies,
    criticalCount,
    lastScanTime,
    isScanning,
    scanNow,
    snapshotCount,
  };
}
