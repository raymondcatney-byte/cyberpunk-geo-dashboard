import { Star } from 'lucide-react';
import type { FilterPreset } from '../../hooks/usePolymarketOpportunities';

interface FilterBarProps {
  preset: FilterPreset;
  onPresetChange: (preset: FilterPreset) => void;
  showBookmarksOnly: boolean;
  onBookmarksToggle: () => void;
}

const PRESETS: { id: FilterPreset; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'smart_money', label: 'SMART MONEY' },
  { id: 'major', label: 'MAJOR' },
  { id: 'volatility', label: 'VOLATILITY' },
];

export function FilterBar({
  preset,
  onPresetChange,
  showBookmarksOnly,
  onBookmarksToggle,
}: FilterBarProps) {
  return (
    <div className="h-[50px] border-b border-nerv-brown bg-nerv-void-panel flex items-center px-4 gap-4">
      {/* Anomaly Presets */}
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPresetChange(p.id)}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-colors ${
              preset === p.id
                ? 'bg-nerv-amber-faint border-nerv-amber text-nerv-amber'
                : 'border-nerv-brown text-nerv-rust hover:border-nerv-amber hover:text-nerv-amber'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Bookmark Toggle */}
      <button
        onClick={onBookmarksToggle}
        className={`flex items-center gap-2 px-3 py-1.5 border text-[10px] font-mono uppercase transition-colors ${
          showBookmarksOnly
            ? 'bg-nerv-amber-faint border-nerv-amber text-nerv-amber'
            : 'border-nerv-brown text-nerv-rust hover:border-nerv-amber'
        }`}
      >
        <Star className={`w-3 h-3 ${showBookmarksOnly ? 'fill-nerv-amber' : ''}`} />
        BOOKMARKS
      </button>
    </div>
  );
}
