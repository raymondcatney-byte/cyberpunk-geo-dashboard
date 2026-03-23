import type { FilterPreset } from '../../lib/polymarket-anomalies';

interface AnomalyFiltersProps {
  preset: FilterPreset;
  onPresetChange: (preset: FilterPreset) => void;
  totalCount: number;
  filteredCount: number;
  loading?: boolean;
}

const PRESETS: { id: FilterPreset; label: string; description: string }[] = [
  { 
    id: 'all', 
    label: 'ALL', 
    description: 'All detected anomalies' 
  },
  { 
    id: 'smart_money', 
    label: 'SMART MONEY', 
    description: 'High volume + tight spread + price move' 
  },
  { 
    id: 'major', 
    label: 'MAJOR', 
    description: 'High liquidity or multiple anomalies' 
  },
  { 
    id: 'volatility', 
    label: 'VOLATILITY', 
    description: 'Price swings > 10%' 
  },
];

export function AnomalyFilters({ 
  preset, 
  onPresetChange, 
  totalCount, 
  filteredCount,
  loading 
}: AnomalyFiltersProps) {
  return (
    <div className="h-[50px] border-b border-nerv-brown bg-nerv-void-panel flex items-center px-4 gap-4">
      {/* Preset Buttons */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPresetChange(p.id)}
            disabled={loading}
            title={p.description}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-colors disabled:opacity-50 ${
              preset === p.id
                ? 'bg-nerv-amber/20 border-nerv-amber text-nerv-amber'
                : 'border-nerv-brown text-nerv-rust hover:border-nerv-amber hover:text-nerv-amber'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Count Display */}
      <div className="flex items-center gap-2 text-[10px] font-mono">
        <span className="text-nerv-rust">
          Showing {filteredCount} of {totalCount}
        </span>
        {loading && (
          <span className="text-nerv-orange animate-pulse">
            Analyzing...
          </span>
        )}
      </div>
    </div>
  );
}
