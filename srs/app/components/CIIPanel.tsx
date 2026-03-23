import { Globe, TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useCII } from '../hooks/useWorldMonitor';

interface CIIPanelProps {
  enabled?: boolean;
  onCountryClick?: (countryCode: string) => void;
}

const RISK_COLORS = {
  extreme: { color: 'text-nerv-alert', bg: 'bg-nerv-alert/10', border: 'border-nerv-alert/40' },
  high: { color: 'text-nerv-amber', bg: 'bg-nerv-amber-faint', border: 'border-nerv-amber/40' },
  elevated: { color: 'text-nerv-amber-bright', bg: 'bg-nerv-amber-faint', border: 'border-nerv-amber-bright/40' },
  moderate: { color: 'text-nerv-amber-bright', bg: 'bg-nerv-amber-faint', border: 'border-nerv-amber-bright/40' },
  low: { color: 'text-nerv-amber', bg: 'bg-nerv-amber-faint', border: 'border-nerv-amber-dark' },
};

export function CIIPanel({ enabled = true, onCountryClick }: CIIPanelProps) {
  const { entries, loading, refresh, source } = useCII(enabled);

  if (!enabled) return null;

  const isLive = source === 'api';

  return (
    <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-nerv-orange flex items-center gap-2">
          <Globe className="w-4 h-4 text-nerv-orange" />
          Country Instability
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

      {/* Header */}
      <div className="flex items-center text-[9px] text-nerv-rust uppercase tracking-wider mb-2 px-1 font-mono">
        <span className="flex-1">Country</span>
        <span className="w-12 text-right">Score</span>
        <span className="w-10 text-right">24h</span>
      </div>

      <div className="space-y-1">
        {entries.slice(0, 10).map((entry, idx) => {
          const config = RISK_COLORS[entry.riskLevel];
          const TrendIcon = entry.change24h > 0 ? TrendingUp : entry.change24h < 0 ? TrendingDown : TrendingUp;
          
          return (
            <div
              key={entry.code}
              onClick={() => onCountryClick?.(entry.code)}
              className={`flex items-center gap-2 p-2 border ${config.border} ${config.bg} hover:bg-white/5 transition-colors ${onCountryClick ? 'cursor-pointer' : ''}`}
            >
              {/* Rank */}
              <span className="text-[9px] text-nerv-amber-dim w-4 font-mono">
                {idx + 1}
              </span>

              {/* Country */}
              <div className="flex-1 min-w-0">
                <div className={`text-[10px] font-header font-bold ${config.color}`}>
                  {entry.country}
                </div>
                <div className="text-[8px] text-nerv-rust uppercase font-mono">
                  {entry.riskLevel}
                </div>
              </div>

              {/* Score bar */}
              <div className="w-16 h-1.5 bg-nerv-void-panel overflow-hidden">
                <div
                  className={`h-full ${entry.score > 80 ? 'bg-nerv-alert' : entry.score > 60 ? 'bg-nerv-amber' : entry.score > 40 ? 'bg-nerv-amber' : 'bg-nerv-amber'}`}
                  style={{ width: `${entry.score}%` }}
                />
              </div>

              {/* Score number */}
              <span className={`text-[10px] font-mono w-8 text-right ${config.color}`}>
                {entry.score.toFixed(0)}
              </span>

              {/* Change */}
              <div className={`w-10 text-right flex items-center justify-end gap-0.5 font-mono ${entry.change24h > 0 ? 'text-nerv-alert' : entry.change24h < 0 ? 'text-nerv-amber-bright' : 'text-nerv-amber-dim'}`}>
                <TrendIcon className="w-3 h-3" />
                <span className="text-[9px]">
                  {Math.abs(entry.change24h).toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && !loading && (
          <div className="text-[10px] text-nerv-amber-dim text-center py-4 font-mono">
            CII data unavailable
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-nerv-brown flex flex-wrap gap-2">
        {Object.entries(RISK_COLORS).map(([level, config]) => (
          <div key={level} className="flex items-center gap-1">
            <div className={`w-2 h-2 ${config.bg} border ${config.border}`} />
            <span className="text-[8px] text-nerv-amber-dim uppercase font-mono">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
