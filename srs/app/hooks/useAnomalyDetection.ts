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
        const price24h = market.price24hAgo ?? currentPrice;
        const volume = Number(market.volume || 0);
        const question = market.question || '';
        
        // Calculate change
        const priceChange = Math.abs(currentPrice - price24h);
        const percentChange = price24h > 0 ? (priceChange / price24h) * 100 : 0;
        
        // Detection threshold check - OR condition to be more lenient
        const meetsThreshold = percentChange >= threshold || volume >= 100000;
        if (!meetsThreshold) return;
        
        const topic = detectTopic(question);
        const change = price24h > 0 ? ((currentPrice - price24h) / price24h) * 100 : 0;
        
        // Use actual or simulated prices
        const detectedPrice = price24h > 0 ? price24h : currentPrice * 0.9;
        const peakPrice = change > 0 
          ? Math.max(currentPrice, detectedPrice * 1.1)
          : Math.min(currentPrice, detectedPrice * 0.9);
        
        detected.push({
          id: market.id || market.slug || market.conditionId || String(Math.random()),
          question,
          topic,
          detectedPrice: Math.round(Math.min(detectedPrice, 1) * 100),
          peakPrice: Math.round(Math.min(peakPrice, 1) * 100),
          nowPrice: Math.round(Math.min(currentPrice, 1) * 100),
          change: Number(change.toFixed(2)),
          volume,
          slug: market.slug || market.conditionId || '',
          endDate: market.endDate || '',
        });
      });
      
      // Sort by absolute change, then by volume
      detected.sort((a, b) => {
        const changeDiff = Math.abs(b.change) - Math.abs(a.change);
        if (changeDiff !== 0) return changeDiff;
        return b.volume - a.volume;
      });
      
      setAnomalies(detected.slice(0, 50));
      setLastUpdated(new Date());
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
