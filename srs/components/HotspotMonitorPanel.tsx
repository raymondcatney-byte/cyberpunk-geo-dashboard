import { MapPin, TrendingUp, TrendingDown, Minus, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useHotspots } from '../hooks/useWorldMonitor';

interface HotspotMonitorPanelProps {
  enabled?: boolean;
  onHotspotClick?: (countryCode: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-nerv-alert', bg: 'bg-nerv-alert/10', border: 'border-nerv-alert/40', label: 'CRIT' },
  high: { color: 'text-nerv-amber', bg: 'bg-nerv-amber-faint', border: 'border-nerv-amber/40', label: 'HIGH' },
  medium: { color: 'text-nerv-amber', bg: 'bg-nerv-amber-faint', border: 'border-nerv-amber-bright/40', label: 'MED' },
};

const TREND_ICONS = {
  'escalating': <TrendingUp className="w-3 h-3 text-nerv-alert" />,
  'stable': <Minus className="w-3 h-3 text-nerv-rust" />,
  'de-escalating': <TrendingDown className="w-3 h-3 text-nerv-amber" />,
};

export function HotspotMonitorPanel({ enabled = true, onHotspotClick }: HotspotMonitorPanelProps) {
  const { hotspots, loading, refresh, source } = useHotspots(enabled);

  if (!enabled) return null;

  const isLive = source === 'api';

  return (
    <div className="p-4 bg-nerv-void-panel border border-nerv-brown">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-nerv-orange flex items-center gap-2">
          <MapPin className="w-4 h-4 text-nerv-orange" />
          Hotspot Monitor
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
            <RefreshCw className={`w-3 h-3 text-nerv-amber-dim ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {hotspots.slice(0, 8).map((hotspot) => {
          const config = SEVERITY_CONFIG[hotspot.severity];
          
          return (
            <div
              key={hotspot.id}
              onClick={() => onHotspotClick?.(hotspot.country)}
              className={`p-2.5 border ${config.border} ${config.bg} hover:bg-white/5 transition-colors ${onHotspotClick ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] px-1.5 py-0.5 bg-nerv-void-panel ${config.color} font-mono`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] text-nerv-orange truncate font-header">
                      {hotspot.country}
                    </span>
                  </div>
                  <p className="text-[10px] text-nerv-rust leading-snug truncate font-mono">
                    {hotspot.name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {TREND_ICONS[hotspot.trend]}
                  <div className="text-[9px] text-nerv-amber font-mono mt-0.5 uppercase">
                    {hotspot.events24h} events
                  </div>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1 bg-nerv-void-panel overflow-hidden">
                  <div
                    className={`h-full ${hotspot.score > 80 ? 'bg-nerv-alert' : hotspot.score > 50 ? 'bg-nerv-amber' : 'bg-nerv-amber-bright'}`}
                    style={{ width: `${Math.min(100, hotspot.score)}%` }}
                  />
                </div>
                <span className="text-[9px] font-mono text-nerv-amber-dim">
                  {hotspot.score}
                </span>
              </div>
            </div>
          );
        })}

        {hotspots.length === 0 && !loading && (
          <div className="text-[10px] text-nerv-amber-dim text-center py-4 font-mono">
            No active hotspots detected
          </div>
        )}
      </div>
    </div>
  );
}
