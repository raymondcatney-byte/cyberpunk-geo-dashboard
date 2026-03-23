import { useEffect, useState, useMemo, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
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

interface AnomalyDashboardProps {
  embedded?: boolean;
}

export function AnomalyDashboard({ embedded = false }: AnomalyDashboardProps) {
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

  return (
    <div className={`flex flex-col bg-nerv-void ${embedded ? 'h-full' : 'min-h-screen'}`}>
      {/* Filters - Only show when embedded (parent has header) */}
      {embedded && (
        <AnomalyFilters
          preset={preset}
          onPresetChange={setPreset}
          totalCount={anomalies.length}
          filteredCount={filteredAnomalies.length}
          loading={loading}
        />
      )}

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

      {/* Footer - Only show when embedded */}
      {embedded && (
        <div className="h-[30px] border-t border-nerv-brown bg-nerv-void-panel flex items-center px-4 text-[9px] text-nerv-rust font-mono">
          <span>Tags: Geopolitics (100265) | Economy (100328) | Finance (120) | Tech (1401) | Crypto (21)</span>
          <div className="flex-1" />
          <span>Auto-refresh: 60s</span>
        </div>
      )}
    </div>
  );
}
