import { useState, useMemo } from 'react';
import { 
  Radio, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Shield,
  DollarSign,
  Globe,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertOctagon
} from 'lucide-react';
import type { Signal, ConfidenceLevel } from '../lib/defi-apis';

interface SovereignSignalEngineProps {
  signals: Signal[];
  maxDisplay?: number;
}

const confidenceConfig: Record<ConfidenceLevel, { color: string; bg: string; icon: typeof AlertTriangle }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: AlertOctagon },
  high: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: AlertTriangle },
  medium: { color: 'text-[var(--hazard)]', bg: 'bg-[var(--hazard)]/10 border-[var(--hazard)]/30', icon: Activity },
  low: { color: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30', icon: Activity },
};

const sourceIcons: Record<string, typeof Globe> = {
  polymarket: Globe,
  whale: DollarSign,
  yield: TrendingUp,
  aircraft: Activity,
  satellite: Radio,
  seismic: AlertTriangle,
  weather: Activity,
};

export function SovereignSignalEngine({ signals, maxDisplay = 10 }: SovereignSignalEngineProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<string | null>(null);

  // Group signals by confidence
  const groupedSignals = useMemo(() => {
    const critical = signals.filter(s => s.confidence === 'critical');
    const high = signals.filter(s => s.confidence === 'high');
    const medium = signals.filter(s => s.confidence === 'medium');
    const low = signals.filter(s => s.confidence === 'low');
    return { critical, high, medium, low };
  }, [signals]);

  // Top signals for display
  const displaySignals = useMemo(() => {
    return signals.slice(0, maxDisplay);
  }, [signals, maxDisplay]);

  const hasCritical = groupedSignals.critical.length > 0;

  return (
    <div className={`nerv-panel border ${hasCritical ? 'border-red-500/40' : 'border-[var(--hazard)]'}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 transition-colors ${
          hasCritical ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-[var(--hazard)]/10 hover:bg-[var(--hazard)]/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <Radio className={`w-4 h-4 ${hasCritical ? 'text-red-400 animate-pulse' : 'text-[var(--hazard)]'}`} />
          <span className={`nerv-label ${hasCritical ? 'text-red-400' : 'text-[var(--hazard)]'}`}>
            SOVEREIGN SIGNAL ENGINE
          </span>
          {hasCritical && (
            <span className="flex items-center gap-1 text-xs text-red-400 animate-pulse">
              <AlertOctagon className="w-3 h-3" />
              CRITICAL ALERT
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Signal counts */}
          <div className="flex items-center gap-2 text-xs">
            {groupedSignals.critical.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                {groupedSignals.critical.length} CRIT
              </span>
            )}
            {groupedSignals.high.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                {groupedSignals.high.length} HIGH
              </span>
            )}
            <span className="text-[var(--steel)]">
              Total: <span className="text-[var(--terminal)]">{signals.length}</span>
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--steel)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--steel)]" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {signals.length === 0 ? (
            <div className="text-center py-8 text-zinc-600">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active signals</p>
              <p className="text-xs mt-1">Monitoring all intelligence sources...</p>
            </div>
          ) : (
            <>
              {/* Signal List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
                {displaySignals.map((signal) => (
                  <SignalCard 
                    key={signal.id} 
                    signal={signal}
                    isSelected={selectedSignal === signal.id}
                    onClick={() => setSelectedSignal(selectedSignal === signal.id ? null : signal.id)}
                  />
                ))}
              </div>

              {/* Correlation Matrix Mini */}
              <div className="mt-4 pt-3 border-t border-[var(--grid)]">
                <div className="text-[10px] text-[var(--steel)] uppercase tracking-wider mb-2">
                  Source Correlation
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(groupedSignals).map(([level, sigs]) => (
                    <div 
                      key={level}
                      className={`px-2 py-1 text-xs border ${
                        level === 'critical' ? 'border-red-500/30 text-red-400' :
                        level === 'high' ? 'border-amber-500/30 text-amber-400' :
                        level === 'medium' ? 'border-[var(--hazard)]/30 text-[var(--hazard)]' :
                        'border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {level.toUpperCase()}: {sigs.length}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Signal Card Component
function SignalCard({ 
  signal, 
  isSelected, 
  onClick 
}: { 
  signal: Signal; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = confidenceConfig[signal.confidence];
  const Icon = sourceIcons[signal.source] || Activity;

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer border transition-all ${
        config.bg
      } ${
        isSelected ? 'ring-1 ring-[var(--hazard)]' : ''
      } hover:brightness-110`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-4 h-4 ${config.color}`} />
          <span className="text-sm font-medium text-[var(--terminal)]">
            {signal.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded uppercase ${config.color} bg-black/40`}>
            {signal.confidence}
          </span>
          {isSelected ? (
            <ChevronUp className="w-4 h-4 text-[var(--steel)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--steel)]" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isSelected && (
        <div className="px-3 pb-3 space-y-3 border-t border-[var(--grid)]/50 pt-3">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {signal.description}
          </p>

          {/* Data Preview */}
          {signal.data && (
            <div className="p-2 bg-black/40 border border-[var(--grid)] text-xs font-mono text-zinc-500 overflow-x-auto">
              {JSON.stringify(signal.data, null, 2).slice(0, 200)}
              {JSON.stringify(signal.data).length > 200 && '...'}
            </div>
          )}

          {/* Recommendation */}
          <div className="flex items-start gap-2 p-2 bg-[var(--hazard)]/5 border border-[var(--hazard)]/20">
            <Zap className="w-4 h-4 text-[var(--hazard)] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] text-[var(--hazard)] uppercase tracking-wider mb-1">
                Recommended Action
              </div>
              <p className="text-xs text-[var(--terminal)]">
                {signal.recommendation}
              </p>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-[10px] text-zinc-600 text-right">
            Detected: {new Date(signal.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Minimized Preview */}
      {!isSelected && (
        <div className="px-3 pb-2 text-xs text-zinc-500 truncate">
          {signal.recommendation}
        </div>
      )}
    </div>
  );
}
