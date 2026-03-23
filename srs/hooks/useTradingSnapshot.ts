import { useCallback, useEffect, useState } from 'react';
import { getTradingSnapshot, type TradingSnapshot } from '../lib/trading-intel';

export function useTradingSnapshot(enabled: boolean = true, intervalMs: number = 60_000) {
  const [snapshot, setSnapshot] = useState<TradingSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const next = await getTradingSnapshot();
      setSnapshot(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SNAPSHOT_FAILED');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs, refresh]);

  return { snapshot, loading, error, refresh };
}