/**
 * React hook for KB Causation Engine
 * Manages engine instance, persistence, and analysis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  createKBEngine,
  CausationEngine,
  KBVectorStore,
  CausationQuery,
  CausationAnalysis,
  Domain,
  KB_STORAGE_KEY,
  defaultPatterns,
} from '@/lib/kbCausation';

export interface UseKBCausationReturn {
  analyze: (query: CausationQuery) => Promise<CausationAnalysis | null>;
  analyzePolymarketEvent: (event: PolymarketEvent) => Promise<CausationAnalysis | null>;
  loading: boolean;
  lastResult: CausationAnalysis | null;
  error: string | null;
  stats: { total: number; byType: Record<string, number>; byDomain: Record<string, number> } | null;
  isReady: boolean;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  yesPrice: number;
  volume: number;
  domain?: Domain;
  externalEvents?: Array<{
    type: string;
    description: string;
    significance: number;
  }>;
}

// Infer domain from market title
function inferDomain(title: string): Domain {
  const lower = title.toLowerCase();
  if (lower.includes('fda') || lower.includes('drug') || lower.includes('approval') || lower.includes('clinical')) return 'biotech';
  if (lower.includes('election') || lower.includes('vote') || lower.includes('trump') || lower.includes('biden') || lower.includes('war') || lower.includes('ukraine')) return 'geopolitics';
  if (lower.includes('bitcoin') || lower.includes('eth') || lower.includes('crypto') || lower.includes('etf')) return 'crypto';
  if (lower.includes('oil') || lower.includes('gold') || lower.includes('commodity')) return 'commodities';
  if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm') || lower.includes('model')) return 'ai';
  if (lower.includes('robot') || lower.includes('tesla') || lower.includes('vehicle')) return 'robotics';
  return 'geopolitics'; // Default
}

// Detect external events from market title
function detectExternalEvents(title: string): Array<{ type: string; description: string; significance: number }> {
  const events: Array<{ type: string; description: string; significance: number }> = [];
  const lower = title.toLowerCase();

  // FDA/Drug events
  if (lower.includes('adcom') || lower.includes('advisory committee')) {
    events.push({ type: 'adcom', description: 'FDA Advisory Committee vote detected', significance: 0.9 });
  }
  if (lower.includes('pdufa') || lower.includes('approval date')) {
    events.push({ type: 'pdufa', description: 'PDUFA approval deadline', significance: 0.85 });
  }
  if (lower.includes('phase 3') || lower.includes('phase iii')) {
    events.push({ type: 'phase3', description: 'Phase 3 trial results', significance: 0.8 });
  }

  // Election events
  if (lower.includes('election') && lower.includes('2024')) {
    events.push({ type: 'election', description: '2024 election event', significance: 0.75 });
  }

  // Crypto events
  if (lower.includes('etf approval') || lower.includes('sec')) {
    events.push({ type: 'regulatory', description: 'Regulatory decision pending', significance: 0.85 });
  }

  return events;
}

export function useKBCausation(): UseKBCausationReturn {
  const engineRef = useRef<{ vectorStore: KBVectorStore; causationEngine: CausationEngine } | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CausationAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; byType: Record<string, number>; byDomain: Record<string, number> } | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize engine and load data
  useEffect(() => {
    const init = async () => {
      try {
        const engine = createKBEngine();
        engineRef.current = engine;

        // Try to load from localStorage
        const saved = localStorage.getItem(KB_STORAGE_KEY);
        if (saved) {
          await engine.vectorStore.deserialize(saved);
        } else {
          // Seed with default patterns
          await engine.vectorStore.storeBatch(defaultPatterns);
        }

        // Update stats
        const currentStats = await engine.vectorStore.stats();
        setStats(currentStats);
        setIsReady(true);
      } catch (err) {
        setError('Failed to initialize KB engine: ' + (err as Error).message);
        // Still create engine with defaults
        const engine = createKBEngine();
        await engine.vectorStore.storeBatch(defaultPatterns);
        engineRef.current = engine;
        setIsReady(true);
      }
    };

    init();
  }, []);

  // Persist to localStorage when stats change
  useEffect(() => {
    if (isReady && engineRef.current) {
      const data = engineRef.current.vectorStore.serialize();
      localStorage.setItem(KB_STORAGE_KEY, data);
    }
  }, [isReady, stats]);

  // Generic analyze function
  const analyze = useCallback(async (query: CausationQuery): Promise<CausationAnalysis | null> => {
    if (!engineRef.current) {
      setError('Engine not initialized');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await engineRef.current.causationEngine.analyze(query);
      setLastResult(result);
      
      // Update stats
      const currentStats = await engineRef.current.vectorStore.stats();
      setStats(currentStats);
      
      return result;
    } catch (err) {
      setError('Analysis failed: ' + (err as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Convenience function for Polymarket events
  const analyzePolymarketEvent = useCallback(async (event: PolymarketEvent): Promise<CausationAnalysis | null> => {
    const domain = event.domain || inferDomain(event.title);
    const externalEvents = event.externalEvents || detectExternalEvents(event.title);

    // Calculate price move from yesPrice (assuming 0.5 baseline or previous price)
    const priceMove = {
      magnitude: (event.yesPrice - 0.5) * 2, // Normalize to -1 to 1 range
      timeframe: '24h'
    };

    const query: CausationQuery = {
      asset: event.title.substring(0, 50), // Use title as asset identifier
      priceMove,
      domain,
      currentMarketPrice: event.yesPrice,
      externalEvents: externalEvents.map(e => ({
        type: e.type,
        description: e.description,
        timestamp: Date.now(),
        significance: e.significance
      }))
    };

    return analyze(query);
  }, [analyze]);

  return {
    analyze,
    analyzePolymarketEvent,
    loading,
    lastResult,
    error,
    stats,
    isReady
  };
}
