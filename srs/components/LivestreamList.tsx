import { Radio, MapPin } from 'lucide-react';
import { LIVESTREAMS } from '../config/livestreams';

interface LivestreamListProps {
  isVisible: boolean;
  activeStreamId: string | null;
  onSelect: (id: string) => void;
}

export function LivestreamList({ isVisible, activeStreamId, onSelect }: LivestreamListProps) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 left-4 z-40 w-[200px] bg-black/90 border border-nerv-orange/30">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 bg-nerv-orange/10 border-b border-nerv-orange/30">
        <Radio className="w-3 h-3 text-nerv-orange" />
        <span className="text-[10px] font-mono font-bold text-nerv-orange uppercase tracking-wider">
          Live Cameras
        </span>
      </div>

      {/* Camera List */}
      <div className="max-h-[280px] overflow-y-auto">
        {LIVESTREAMS.map((stream) => {
          const isActive = activeStreamId === stream.id;
          
          return (
            <button
              key={stream.id}
              onClick={() => onSelect(stream.id)}
              className={`w-full flex items-center gap-2 p-2 text-left transition-all border-b border-nerv-brown/30 last:border-0 hover:bg-nerv-orange/10 ${
                isActive 
                  ? 'bg-nerv-orange/20 border-l-2 border-l-nerv-orange' 
                  : 'border-l-2 border-l-transparent'
              }`}
            >
              <MapPin className={`w-3 h-3 flex-shrink-0 ${
                isActive ? 'text-nerv-orange' : 'text-nerv-rust'
              }`} />
              <div className="min-w-0 flex-1">
                <div className={`text-[10px] font-mono truncate ${
                  isActive ? 'text-nerv-orange font-bold' : 'text-nerv-amber'
                }`}>
                  {stream.city}
                </div>
                <div className="text-[9px] text-nerv-rust truncate">
                  {stream.country}
                </div>
              </div>
              {isActive && (
                <div className="w-1.5 h-1.5 bg-nerv-orange rounded-full animate-pulse flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-1.5 bg-nerv-void-panel border-t border-nerv-orange/20">
        <div className="text-[9px] font-mono text-nerv-rust text-center">
          {LIVESTREAMS.length} cameras active
        </div>
      </div>
    </div>
  );
}
