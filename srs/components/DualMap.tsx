import { useState } from 'react';
import { Radio } from 'lucide-react';

import { HexHeatmapGlobe } from './HexHeatmapGlobe';
import { LivestreamMarkersOverlay } from './LivestreamMarkersOverlay';
import type { HexHeatmapGlobeHandle } from '../types/globe';

interface MarkerPosition {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface DualMapProps {
  showLivestreamMarkers?: boolean;
  onToggleLiveView?: () => void;
  selectedMarkerId?: string | null;
  onMarkerSelect?: (id: string | null) => void;
  onMarkerDoubleClick?: (id: string) => void;
  hexGlobeRef?: React.RefObject<HexHeatmapGlobeHandle | null>;
}

export function DualMap({
  showLivestreamMarkers = false,
  onToggleLiveView,
  selectedMarkerId,
  onMarkerSelect,
  onMarkerDoubleClick,
  hexGlobeRef,
}: DualMapProps) {
  const [markerPositions, setMarkerPositions] = useState<MarkerPosition[]>([]);

  return (
    <div className="relative h-full w-full">
      {/* Live View Toggle - Center Top */}
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

      {/* Globe */}
      <div className="absolute inset-0">
        <HexHeatmapGlobe
          ref={hexGlobeRef}
          showLivestreamMarkers={showLivestreamMarkers}
          selectedMarkerId={selectedMarkerId}
          onMarkerPositionsUpdate={setMarkerPositions}
        />
      </div>

      {/* Marker Overlay Buttons */}
      <LivestreamMarkersOverlay
        positions={markerPositions}
        selectedMarkerId={selectedMarkerId || null}
        onMarkerSelect={onMarkerSelect || (() => {})}
        onMarkerDoubleClick={onMarkerDoubleClick || (() => {})}
        showMarkers={showLivestreamMarkers}
      />
    </div>
  );
}
