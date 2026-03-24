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
      
      const response = await fetch('/api/markets?active=true&sort=volume24h&limit=200');
      if (!response.ok) throw new Error('Failed to fetch markets');
      
      const data = await response.json();
      const markets = data.markets || [];
      
      const detected: Anomaly[] = [];
      
      markets.forEach((market: any) => {
        const currentPrice = market.currentPrice ?? 0.5;
        const price24h = market.price24hAgo ?? currentPrice;
        const volume = market.volume24h ?? market.volume ?? 0;
        const question = market.question ?? '';
        
        // Calculate change
        const priceChange = Math.abs(currentPrice - price24h);
        const percentChange = price24h > 0 ? (priceChange / price24h) * 100 : 0;
        
        // Detection threshold check
        if (percentChange < threshold || volume < minVolume) return;
        
        const topic = detectTopic(question);
        const change = ((currentPrice - price24h) / price24h) * 100;
        
        // Simulate detected/peak prices based on current movement
        const detectedPrice = price24h;
        const peakPrice = change > 0 
          ? Math.max(currentPrice, price24h * 1.1)
          : Math.min(currentPrice, price24h * 0.9);
        
        detected.push({
          id: market.id || market.slug || String(Math.random()),
          question,
          topic,
          detectedPrice: Math.round(detectedPrice * 100),
          peakPrice: Math.round(peakPrice * 100),
          nowPrice: Math.round(currentPrice * 100),
          change: Number(change.toFixed(2)),
          volume,
          slug: market.slug || '',
          endDate: market.endDate || '',
        });
      });
      
      // Sort by absolute change
      detected.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      
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
