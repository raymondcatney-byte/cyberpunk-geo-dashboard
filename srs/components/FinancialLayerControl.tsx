import { TrendingUp, DollarSign, Activity, Wallet, Brain } from 'lucide-react';

interface FinancialLayerControlProps {
  layers: {
    polymarket: boolean;
    whales: boolean;
    yields: boolean;
    causation?: boolean;
  };
  onToggle: (layer: 'polymarket' | 'whales' | 'yields' | 'causation') => void;
}

export function FinancialLayerControl({ layers, onToggle }: FinancialLayerControlProps) {
  return (
    <div className="pointer-events-auto">
    <div className="bg-nerv-void-panel border border-nerv-brown p-3 font-mono">
        <div className="text-[10px] font-mono uppercase tracking-widest text-nerv-orange mb-2 flex items-center gap-2">
          <TrendingUp className="w-3 h-3" />
          Financial Intel
        </div>
        
        <div className="space-y-2">
          {/* Polymarket Toggle */}
          <button
            onClick={() => onToggle('polymarket')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 border transition-all ${
              layers.polymarket
                ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Polymarket</span>
            </div>
            <div className={`w-2 h-2 ${layers.polymarket ? 'bg-nerv-orange animate-pulse' : 'bg-nerv-brown'}`} />
          </button>

          {/* Whale Watcher Toggle */}
          <button
            onClick={() => onToggle('whales')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 border transition-all ${
              layers.whales
                ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
            }`}
          >
            <div className="flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Whales</span>
            </div>
            <div className={`w-2 h-2 ${layers.whales ? 'bg-nerv-orange animate-pulse' : 'bg-nerv-brown'}`} />
          </button>

          {/* Yield Radar Toggle */}
          <button
            onClick={() => onToggle('yields')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 border transition-all ${
              layers.yields
                ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Yields</span>
            </div>
            <div className={`w-2 h-2 ${layers.yields ? 'bg-nerv-orange animate-pulse' : 'bg-nerv-brown'}`} />
          </button>

          {/* Causation Engine Toggle */}
          <button
            onClick={() => onToggle('causation')}
            className={`w-full flex items-center justify-between gap-3 px-3 py-2 border transition-all ${
              layers.causation
                ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
            }`}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-wide">Causation</span>
            </div>
            <div className={`w-2 h-2 ${layers.causation ? 'bg-purple-400 animate-pulse' : 'bg-nerv-brown'}`} />
          </button>
        </div>

        {/* Legend */}
        <div className="mt-3 pt-2 border-t border-nerv-brown">
          <div className="flex items-center gap-3 text-[9px] font-mono text-nerv-rust">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-nerv-orange" />
              <span>Predictions</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-nerv-orange" />
              <span>Whales</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-nerv-amber-bright" />
              <span>Yield</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
