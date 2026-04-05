import { Radio } from 'lucide-react';

import { WarRoomGlobe } from './warroom/WarRoomGlobe';
import type { HexHeatmapGlobeHandle } from '../types/globe';

interface DualMapProps {
  showLivestreamMarkers?: boolean;
  onToggleLiveView?: () => void;
  activeStreamId?: string | null;
  onCitySelect?: (id: string) => void;
  // Note: hexGlobeRef kept for API compatibility
  hexGlobeRef?: React.RefObject<HexHeatmapGlobeHandle | null>;
}

export function DualMap({
  showLivestreamMarkers = false,
  onToggleLiveView,
  activeStreamId,
  onCitySelect,
  hexGlobeRef,
}: DualMapProps) {
  return (
    <div className="relative h-full w-full">
      {/* Live View Toggle - Center Top - PRESERVED UI */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex bg-black/80 backdrop-blur-md border border-zinc-700 rounded-lg overflow-hidden">
        <button
          onClick={onToggleLiveView}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-mono transition-all ${
            showLivestreamMarkers
              ? 'bg-nerv-orange/20 text-nerv-orange border-nerv-orange/50'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          LIVE VIEW
          <span
            className={`ml-1 px-1.5 py-0.5 text-[9px] rounded ${
              showLivestreamMarkers
                ? 'bg-nerv-orange text-black'
                : 'bg-zinc-700 text-zinc-400'
            }`}
          >
            {showLivestreamMarkers ? 'ON' : 'OFF'}
          </span>
        </button>
      </div>

      {/* Globe with Live View Support */}
      <div className="absolute inset-0">
        <WarRoomGlobe
          showLivestreamMarkers={showLivestreamMarkers}
          activeStreamId={activeStreamId}
          onCitySelect={onCitySelect}
        />
      </div>
    </div>
  );
}
