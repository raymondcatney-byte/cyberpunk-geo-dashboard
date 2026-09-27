import { useState, useEffect, useCallback, useMemo } from 'react';
import { detectTopic, type TopicKey } from '../config/anomalyTopics';

interface Anomaly {
  id: string;
  question: string;
  topic: TopicKey | 'other';
  detectedPrice: number;
  peakPrice: number;
  nowPrice: number;
  change: number;
  volume: number;
  slug: string;
  endDate: string;
  yesTokenId?: string;
}

interface UseAnomalyDetectionOptions {
  threshold?: number;
  minVolume?: number;
  activeTopics?: (TopicKey | 'other')[];
}

export function useAnomalyDetection(options: UseAnomalyDetectionOptions = {}) {
  const { threshold = 15, minVolume = 1000, activeTopics } = options;
  
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const detectAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the server-side API endpoint (no CORS issues)
      const response = await fetch('/api/search?action=masterMarkets');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      
      // Flatten all markets from all categories
      const allMarkets: any[] = [];
      if (data.masterMarkets) {
        Object.values(data.masterMarkets).forEach((categoryMarkets: any) => {
          if (Array.isArray(categoryMarkets)) {
            allMarkets.push(...categoryMarkets);
          }
        });
      }
      
      const detected: Anomaly[] = [];
      
      allMarkets.forEach((market: any) => {
        const currentPrice = market.yesPrice ?? 0.5;
        // Real 24h movement from gamma's oneDayPriceChange (plumbed through
        // Phase 0). The old price24hAgo field never existed in any payload, so
        // change always computed as 0 and peak was fabricated.
        const dayChange = typeof market.oneDayPriceChange === 'number' ? market.oneDayPriceChange : null;
        const price24h = dayChange !== null ? currentPrice - dayChange : null;
        const volume = Number(market.volume || 0);
        const question = market.question || '';

        // Calculate change
        const percentChange = dayChange !== null && price24h !== null && price24h > 0
          ? Math.abs(dayChange / price24h) * 100
          : 0;

        // Detection threshold check - OR condition to be more lenient
        const meetsThreshold = percentChange >= threshold || volume >= 100000;
        if (!meetsThreshold) return;

        const topic = detectTopic(question);
        const change = dayChange !== null && price24h !== null && price24h > 0
          ? (dayChange / price24h) * 100
          : 0;

        // Real data only: detected = actual 24h-ago price; peak starts as the
        // known extreme (now when rising, 24h-ago when falling) and is replaced
        // by the true intraday high from the history deep-dive below.
        const detectedPrice = price24h !== null ? price24h : currentPrice;
        const peakPrice = change > 0 ? currentPrice : detectedPrice;

        detected.push({
          id: market.id || market.slug || market.conditionId || String(Math.random()),
          question,
          topic,
          detectedPrice: Math.round(Math.min(Math.max(detectedPrice, 0), 1) * 100),
          peakPrice: Math.round(Math.min(Math.max(peakPrice, 0), 1) * 100),
          nowPrice: Math.round(Math.min(currentPrice, 1) * 100),
          change: Number(change.toFixed(2)),
          volume,
          slug: market.slug || market.conditionId || '',
          endDate: market.endDate || '',
          yesTokenId: typeof market.yesTokenId === 'string' ? market.yesTokenId : undefined,
        });
      });
      
      // Sort by absolute change, then by volume
      detected.sort((a, b) => {
        const changeDiff = Math.abs(b.change) - Math.abs(a.change);
        if (changeDiff !== 0) return changeDiff;
        return b.volume - a.volume;
      });
      
      const screened = detected.slice(0, 50);
      setAnomalies(screened);
      setLastUpdated(new Date());

      // Deep-dive: true intraday peak for the top 10 movers via the history
      // proxy. Screening is cheap (gamma fields); only these rows pay a fetch.
      const top = screened.filter((a) => a.yesTokenId).slice(0, 10);
      await Promise.allSettled(
        top.map(async (a) => {
          const res = await fetch(
            `/api/polymarket/history?token=${encodeURIComponent(a.yesTokenId as string)}&window=1d`,
            { headers: { Accept: 'application/json' } }
          );
          const data = await res.json();
          if (!res.ok || !data.ok || !Array.isArray(data.points) || data.points.length === 0) return;
          const prices = data.points
            .map((p: any) => Number(p.price))
            .filter((v: number) => Number.isFinite(v));
          if (prices.length === 0) return;
          const peak = Math.max(...prices);
          setAnomalies((prev) =>
            prev.map((x) =>
              x.id === a.id ? { ...x, peakPrice: Math.round(Math.min(Math.max(peak, 0), 1) * 100) } : x
            )
          );
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [threshold, minVolume]);

  // Filter by active topics
  const filteredAnomalies = useMemo(() => {
    if (!activeTopics || activeTopics.length === 0) return anomalies;
    return anomalies.filter(a => activeTopics.includes(a.topic));
  }, [anomalies, activeTopics]);

  // Initial fetch
  useEffect(() => {
    detectAnomalies();
  }, [detectAnomalies]);

  // Polling every 30 seconds
  useEffect(() => {
    const interval = setInterval(detectAnomalies, 30000);
    return () => clearInterval(interval);
  }, [detectAnomalies]);

  return {
    anomalies: filteredAnomalies,
    allAnomalies: anomalies,
    loading,
    error,
    lastUpdated,
    refetch: detectAnomalies,
  };
}
