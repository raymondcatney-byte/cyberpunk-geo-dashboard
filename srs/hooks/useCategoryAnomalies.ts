/**
 * useCategoryAnomalies Hook
 * Detects anomalies on top 10 markets per category (not just watchlist)
 * Stays under 5MB localStorage limit
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MarketSnapshot,
  AnomalyResult,
  scanForAnomalies,
  recordSnapshot as baseRecordSnapshot,
  loadSnapshots as baseLoadSnapshots,
} from '../lib/watchlist-anomalies';

const CATEGORIES = ['geopolitics', 'economy', 'commodities', 'crypto', 'biotech', 'ai'] as const;
export type AnomalyCategory = typeof CATEGORIES[number];

interface CategorySnapshot {
  timestamp: number;
  category: AnomalyCategory;
  markets: MarketSnapshot[];
}

interface UseCategoryAnomaliesReturn {
  allAnomalies: AnomalyResult[];
  categoryAnomalies: Record<AnomalyCategory, AnomalyResult[]>;
  totalAnomalies: number;
  criticalCount: number;
  lastScanTime: Date | null;
  isScanning: boolean;
  scanNow: () => Promise<void>;
  activeCategories: AnomalyCategory[];
  toggleCategory: (category: AnomalyCategory) => void;
}

const STORAGE_KEY = 'pm_category_top10_snapshots';
const SCAN_INTERVAL = 120000; // 2 minutes (less frequent to save API calls)
const MAX_SNAPSHOTS = 24; // 24 snapshots per category (48h at 2-min intervals)

function loadCategorySnapshots(): CategorySnapshot[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const snapshots = JSON.parse(stored) as CategorySnapshot[];
    // Keep only last 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000);
    return snapshots.filter(s => s.timestamp > cutoff);
  } catch (e) {
    console.warn('[useCategoryAnomalies] Failed to load:', e);
    return [];
  }
}

function saveCategorySnapshots(snapshots: CategorySnapshot[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Keep only last MAX_SNAPSHOTS per category
    const byCategory = new Map<AnomalyCategory, CategorySnapshot[]>();
    
    for (const snap of snapshots) {
      if (!byCategory.has(snap.category)) {
        byCategory.set(snap.category, []);
      }
      byCategory.get(snap.category)!.push(snap);
    }
    
    const trimmed: CategorySnapshot[] = [];
    for (const [cat, snaps] of byCategory) {
      // Sort by timestamp and keep last MAX_SNAPSHOTS
      const sorted = snaps.sort((a, b) => a.timestamp - b.timestamp);
      trimmed.push(...sorted.slice(-MAX_SNAPSHOTS));
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('[useCategoryAnomalies] Failed to save:', e);
  }
}

export function useCategoryAnomalies(): UseCategoryAnomaliesReturn {
  const [allAnomalies, setAllAnomalies] = useState<AnomalyResult[]>([]);
  const [categoryAnomalies, setCategoryAnomalies] = useState<Record<AnomalyCategory, AnomalyResult[]>>({
    geopolitics: [],
    economy: [],
    commodities: [],
    crypto: [],
    biotech: [],
    ai: [],
  });
  const [totalAnomalies, setTotalAnomalies] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [activeCategories, setActiveCategories] = useState<AnomalyCategory[]>(['geopolitics', 'commodities', 'crypto']);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);

  const scanCategory = useCallback(async (category: AnomalyCategory): Promise<AnomalyResult[]> => {
    try {
      const categoryMap: Record<AnomalyCategory, string> = {
        geopolitics: 'GEOPOLITICS',
        economy: 'MACRO',
        commodities: 'ENERGY_COMMODITIES',
        crypto: 'DeFi',
        biotech: 'BIOTECH',
        ai: 'AI',
      };

      const mapped = categoryMap[category];
      const response = await fetch(
        `/api/polymarket/events?category=${encodeURIComponent(mapped)}&limit=10&_ts=${Date.now()}`
      );
      if (!response.ok) throw new Error(`Failed to fetch ${category}`);
      
      const data = await response.json();
      if (!data.ok || !data.events) return [];
      
      // Convert to MarketSnapshot format
      const currentMarkets: MarketSnapshot[] = data.events.map((m: any) => ({
        slug: m.slug,
        yesPrice: m.yesPrice,
        volume: m.volume,
        liquidity: m.liquidity,
        spread: Math.abs(m.yesPrice - (1 - m.noPrice)),
        timestamp: Date.now(),
      }));
      
      // Load previous snapshot for this category
      const allSnapshots = loadCategorySnapshots();
      const categorySnapshots = allSnapshots.filter(s => s.category === category);
      const lastSnapshot = categorySnapshots.length > 0 
        ? categorySnapshots[categorySnapshots.length - 1] 
        : null;
      
      // Create previous markets map
      const previousMap = lastSnapshot 
        ? new Map(lastSnapshot.markets.map(m => [m.slug, m]))
        : new Map();
      
      // Detect anomalies
      const results: AnomalyResult[] = [];
      for (const current of currentMarkets) {
        const previous = previousMap.get(current.slug) || null;
        
        // Use base scan function but we need to import it properly
        // For now, simplified anomaly detection
        const priceChange = previous 
          ? (current.yesPrice - previous.yesPrice) / previous.yesPrice 
          : 0;
        
        const anomalies = [];
        
        if (Math.abs(priceChange) >= 0.05) {
          anomalies.push({
            type: priceChange > 0 ? 'price_spike' : 'price_drop',
            severity: Math.abs(priceChange) > 0.10 ? 'critical' : Math.abs(priceChange) > 0.07 ? 'high' : 'medium',
            message: `Price ${priceChange > 0 ? 'up' : 'down'} ${(Math.abs(priceChange) * 100).toFixed(1)}%`,
            value: priceChange,
            threshold: 0.05,
            timestamp: Date.now(),
          });
        }
        
        if (previous && previous.liquidity > 0) {
          const liqChange = (current.liquidity - previous.liquidity) / previous.liquidity;
          if (liqChange <= -0.20) {
            anomalies.push({
              type: 'liquidity_drop',
              severity: liqChange < -0.40 ? 'critical' : liqChange < -0.30 ? 'high' : 'medium',
              message: `Liquidity down ${(Math.abs(liqChange) * 100).toFixed(0)}%`,
              value: liqChange,
              threshold: -0.20,
              timestamp: Date.now(),
            });
          }
        }
        
        if (anomalies.length > 0) {
          results.push({
            slug: current.slug,
            displayName: current.slug.replace(/-/g, ' '),
            category: category.toUpperCase(),
            current,
            previous,
            anomalies,
            maxSeverity: anomalies.some(a => a.severity === 'critical') ? 'critical' :
                        anomalies.some(a => a.severity === 'high') ? 'high' :
                        anomalies.some(a => a.severity === 'medium') ? 'medium' : 'low',
          });
        }
      }
      
      // Save snapshot
      const newSnapshot: CategorySnapshot = {
        timestamp: Date.now(),
        category,
        markets: currentMarkets,
      };
      
      const updatedSnapshots = [...allSnapshots, newSnapshot];
      saveCategorySnapshots(updatedSnapshots);
      
      return results;
    } catch (error) {
      console.error(`[useCategoryAnomalies] Error scanning ${category}:`, error);
      return [];
    }
  }, []);

  const scanNow = useCallback(async () => {
    if (isScanning) return;
    setIsScanning(true);
    
    try {
      const allResults: AnomalyResult[] = [];
      const byCategory: Record<AnomalyCategory, AnomalyResult[]> = {
        geopolitics: [],
        economy: [],
        commodities: [],
        crypto: [],
        biotech: [],
        ai: [],
      };
      
      // Scan each active category
      for (const category of activeCategories) {
        const results = await scanCategory(category);
        allResults.push(...results);
        byCategory[category] = results;
      }
      
      // Calculate totals
      const total = allResults.reduce((sum, r) => sum + r.anomalies.length, 0);
      const critical = allResults.filter(r => r.maxSeverity === 'critical').length;
      
      // Sort by severity
      allResults.sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, null: 4 };
        return order[a.maxSeverity || 'null'] - order[b.maxSeverity || 'null'];
      });
      
      setAllAnomalies(allResults);
      setCategoryAnomalies(byCategory);
      setTotalAnomalies(total);
      setCriticalCount(critical);
      setLastScanTime(new Date());
    } finally {
      setIsScanning(false);
    }
  }, [isScanning, activeCategories, scanCategory]);

  const toggleCategory = useCallback((category: AnomalyCategory) => {
    setActiveCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  }, []);

  // Handle visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Initial scan and interval
  useEffect(() => {
    scanNow();
    
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        scanNow();
      }
    }, SCAN_INTERVAL);
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scanNow]);

  return {
    allAnomalies,
    categoryAnomalies,
    totalAnomalies,
    criticalCount,
    lastScanTime,
    isScanning,
    scanNow,
    activeCategories,
    toggleCategory,
  };
}
