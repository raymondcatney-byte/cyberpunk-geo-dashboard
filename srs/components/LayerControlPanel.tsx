import { Satellite, Activity, RefreshCw } from 'lucide-react';

interface LayerControlPanelProps {
  layers: {
    satellites: boolean;
    earthquakes: boolean;
  };
  onToggle: (layer: 'satellites' | 'earthquakes') => void;
  counts: {
    satellites: number;
    earthquakes: number;
  };
  loading: {
    satellites: boolean;
    earthquakes: boolean;
  };
  onRefresh: {
    satellites: () => void;
    earthquakes: () => void;
  };
}

export function LayerControlPanel({
  layers,
  onToggle,
  counts,
  loading,
  onRefresh,
}: LayerControlPanelProps) {
  return (
    <div className="pointer-events-auto">
      <div className="bg-nerv-void-panel border border-nerv-brown p-3 font-mono">
        <div className="text-[10px] font-mono uppercase tracking-widest text-nerv-orange mb-2 flex items-center gap-2">Data Layers</div>
        
        <div className="space-y-2">
          {/* Satellites Toggle */}
          <button
            onClick={() => onToggle('satellites')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 border transition-all ${
              layers.satellites
                ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
            }`}
          >
            <div className="flex items-center gap-2">
              <Satellite className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">SAT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums font-mono text-nerv-amber font-mono">{counts.satellites}</span>
              {loading.satellites ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onRefresh.satellites(); }}
                  className="p-1 hover:bg-white/10"
                >
                  <RefreshCw className="w-3 h-3 opacity-50 hover:opacity-100" />
                </button>
              )}
            </div>
          </button>

          {/* Earthquakes Toggle */}
          <button
            onClick={() => onToggle('earthquakes')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 border transition-all ${
              layers.earthquakes
                ? 'bg-nerv-alert/10 border-nerv-alert/50 text-nerv-alert'
                : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">USGS</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] tabular-nums font-mono text-nerv-amber-bright">{counts.earthquakes}</span>
              {loading.earthquakes ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); onRefresh.earthquakes(); }}
                  className="p-1 hover:bg-white/10"
                >
                  <RefreshCw className="w-3 h-3 opacity-50 hover:opacity-100" />
                </button>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
