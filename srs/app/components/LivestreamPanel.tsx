import { X, Radio } from 'lucide-react';
import type { LivestreamConfig } from '../config/livestreams';

interface LivestreamPanelProps {
  stream: LivestreamConfig | null;
  onClose: () => void;
}

export function LivestreamPanel({ stream, onClose }: LivestreamPanelProps) {
  if (!stream) return null;

  return (
    <div className="absolute top-4 right-4 z-50 w-[320px] bg-black/95 border border-nerv-orange/50 shadow-[0_0_30px_rgba(232,93,4,0.3)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-nerv-orange/10 border-b border-nerv-orange/30">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Radio className="w-4 h-4 text-nerv-orange" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="text-[11px] font-mono font-bold text-nerv-orange uppercase tracking-wider">
              LIVE
            </div>
            <div className="text-[10px] text-nerv-amber/80 font-mono">
              {stream.city}, {stream.country}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-nerv-orange/20 transition-colors rounded"
        >
          <X className="w-4 h-4 text-nerv-orange/80" />
        </button>
      </div>

      {/* Video Container - Square */}
      <div className="relative w-full aspect-square bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1&controls=1&rel=0`}
          title={`${stream.city} Livestream`}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-nerv-void-panel border-t border-nerv-orange/20">
        <div className="flex items-center justify-between text-[10px] font-mono text-nerv-rust">
          <span>YouTube Live</span>
          <span>Sound off by default</span>
        </div>
      </div>
    </div>
  );
}
