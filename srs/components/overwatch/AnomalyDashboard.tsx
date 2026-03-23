import { useEffect, useState, useMemo, useCallback } from 'react';
import { RefreshCw, AlertTriangle, Radio } from 'lucide-react';
import { 
  getAllAnomalies, 
  filterByPreset, 
  type AnomalyResult, 
  type FilterPreset 
} from '../../lib/polymarket-anomalies';
import { AnomalyCard } from './AnomalyCard';
import { AnomalyFilters } from './AnomalyFilters';

const REFRESH_INTERVAL = 60000; // 60 seconds
const LIMIT_PER_TAG = 10;
const DISPLAY_LIMIT = 10;

export function AnomalyDashboard() {
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<FilterPreset>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch anomalies
  const fetchAnomalies = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await getAllAnomalies(LIMIT_PER_TAG);
      setAnomalies(results);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchAnomalies, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAnomalies]);

  // Filter by preset
  const filteredAnomalies = useMemo(() => {
    return filterByPreset(anomalies, preset);
  }, [anomalies, preset]);

  // Top 10 to display
  const topAnomalies = useMemo(() => {
    return filteredAnomalies.slice(0, DISPLAY_LIMIT);
  }, [filteredAnomalies]);

  // Stats
  const stats = useMemo(() => {
    const total = anomalies.length;
    const withVolumeSpike = anomalies.filter(a => a.anomalies.includes('volume_spike')).length;
    const withPriceSwing = anomalies.filter(a => a.anomalies.includes('price_swing')).length;
    const withSmartMoney = anomalies.filter(a => a.anomalies.includes('smart_money')).length;
    
    return { total, withVolumeSpike, withPriceSwing, withSmartMoney };
  }, [anomalies]);

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      {/* Header */}
      <div className="h-[60px] border-b border-nerv-brown bg-nerv-void-panel flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Radio className="w-5 h-5 text-nerv-orange" />
          <span className="text-nerv-orange font-mono text-sm font-bold tracking-wider">
            ANOMALY DETECTOR
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 ml-6">
          <div className="text-[10px] font-mono">
            <span className="text-nerv-rust">Total: </span>
            <span className="text-nerv-amber">{stats.total}</span>
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-nerv-rust">Volume: </span>
            <span className="text-nerv-amber">{stats.withVolumeSpike}</span>
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-nerv-rust">Price: </span>
            <span className="text-nerv-amber">{stats.withPriceSwing}</span>
          </div>
          <div className="text-[10px] font-mono">
            <span className="text-nerv-rust">Smart: </span>
            <span className="text-nerv-amber">{stats.withSmartMoney}</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Refresh */}
        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-[10px] text-nerv-rust font-mono">
              {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago
            </span>
          )}
          <button
            onClick={fetchAnomalies}
            disabled={loading}
            className="p-2 hover:bg-nerv-orange/10 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-nerv-orange ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <AnomalyFilters
        preset={preset}
        onPresetChange={setPreset}
        totalCount={anomalies.length}
        filteredCount={filteredAnomalies.length}
        loading={loading}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-alert">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <p className="text-sm font-mono">{error}</p>
            <button
              onClick={fetchAnomalies}
              className="mt-4 px-4 py-2 border border-nerv-alert text-nerv-alert hover:bg-nerv-alert/10 transition-colors text-xs uppercase"
            >
              Retry
            </button>
          </div>
        ) : loading && anomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <div className="w-12 h-12 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-mono">Scanning markets...</p>
          </div>
        ) : topAnomalies.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <p className="text-sm font-mono">No anomalies detected</p>
            <p className="text-xs mt-2">Try changing the filter preset</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {topAnomalies.map((result, index) => (
              <AnomalyCard
                key={result.market.id}
                result={result}
                rank={index + 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="h-[30px] border-t border-nerv-brown bg-nerv-void-panel flex items-center px-4 text-[9px] text-nerv-rust font-mono">
        <span>Tags: Geopolitics (100265) | Economy (100328) | Finance (120) | Tech (1401) | Crypto (21)</span>
        <div className="flex-1" />
        <span>Auto-refresh: 60s</span>
      </div>
    </div>
  );
}
