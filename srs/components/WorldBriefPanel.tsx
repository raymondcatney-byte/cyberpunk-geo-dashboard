import { Brain, RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useWorldBrief } from '../hooks/useWorldMonitor';

interface WorldBriefPanelProps {
  enabled?: boolean;
  onFocalPointClick?: (countryCode: string) => void;
}

export function WorldBriefPanel({ enabled = true, onFocalPointClick }: WorldBriefPanelProps) {
  const { brief, loading, refresh, source, error } = useWorldBrief(enabled);

  if (!enabled) return null;

  const getRiskColor = (points: string[]) => {
    if (points.length >= 4) return 'text-nerv-alert border-nerv-alert/40 bg-nerv-alert/10';
    if (points.length >= 2) return 'text-nerv-amber border-nerv-amber/40 bg-nerv-amber-faint';
    return 'text-nerv-amber-bright border-nerv-amber-bright/40 bg-nerv-amber-faint';
  };

  const isLive = source === 'api';

  return (
    <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-nerv-orange flex items-center gap-2">
          <Brain className="w-4 h-4 text-nerv-orange" />
          World Brief
        </h4>
        <div className="flex items-center gap-2">
          {/* Source indicator */}
          <div className={`flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase ${isLive ? 'bg-nerv-amber-faint border border-nerv-orange/40 text-nerv-orange' : 'bg-nerv-amber-faint border border-nerv-amber/40 text-nerv-rust'}`}>
            {isLive ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isLive ? 'LIVE' : 'CACHED'}
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 hover:bg-nerv-orange/10 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 text-nerv-rust ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {brief && (
        <div className="space-y-3">
          {/* Summary */}
          <p className="text-[11px] text-nerv-rust leading-relaxed font-mono">
            {brief.summary}
          </p>

          {/* Focal Points */}
          {brief.focalPoints.length > 0 && (
            <div className="pt-2 border-t border-nerv-brown">
              <div className="text-[9px] font-mono uppercase tracking-wider text-nerv-rust uppercase mb-2">Focal Points (Click to view)</div>
              <div className="flex flex-wrap gap-1.5">
                {brief.focalPoints.map((point, idx) => (
                  <button
                    key={idx}
                    onClick={() => onFocalPointClick?.(point)}
                    className={`px-2 py-0.5 text-[9px] border ${getRiskColor(brief.focalPoints)} font-mono hover:bg-nerv-orange/20 cursor-pointer transition-colors ${onFocalPointClick ? 'cursor-pointer' : ''}`}
                  >
                    {point}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center justify-between font-mono">
            <div className="text-[9px] text-nerv-rust">
              UPDATED {new Date(brief.lastUpdated).toLocaleTimeString()}
            </div>
            {error && (
              <div className="text-[9px] text-nerv-alert" title={error}>
                API UNAVAILABLE
              </div>
            )}
          </div>
        </div>
      )}

      {!brief && !loading && (
        <div className="flex items-center gap-2 text-[10px] text-nerv-rust font-mono">
          <AlertTriangle className="w-3 h-3 text-nerv-alert" />
          Brief unavailable
        </div>
      )}
    </div>
  );
}
