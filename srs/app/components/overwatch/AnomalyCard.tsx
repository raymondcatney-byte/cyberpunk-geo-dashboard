import { ExternalLink } from 'lucide-react';
import type { TopicKey } from '../../../config/anomalyTopics';

interface AnomalyCardProps {
  rank: number;
  question: string;
  topic: TopicKey | 'other';
  detectedPrice: number;
  peakPrice: number;
  nowPrice: number;
  change: number;
  volume: number;
  slug: string;
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return String(vol);
}

export function AnomalyCard({
  rank,
  question,
  topic,
  detectedPrice,
  peakPrice,
  nowPrice,
  change,
  volume,
  slug,
}: AnomalyCardProps) {
  const isPositive = change > 0;
  
  const handleClick = () => {
    window.open(`https://polymarket.com/event/${slug}`, '_blank');
  };

  return (
    <div
      onClick={handleClick}
      className="py-4 px-5 border-b border-nerv-brown/30 cursor-pointer transition-colors hover:bg-nerv-void-panel/50 group"
    >
      {/* Question with rank */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-nerv-rust font-mono text-sm font-bold min-w-[24px]">
          {rank}
        </span>
        <h3 className="text-nerv-amber text-sm font-medium leading-snug group-hover:text-nerv-orange transition-colors">
          {question}
        </h3>
      </div>
      
      {/* Price timeline */}
      <div className="pl-7 mb-2 flex items-center gap-2 text-xs font-mono">
        <span className="text-nerv-rust">
          {detectedPrice}¢
        </span>
        <span className="text-nerv-brown">→</span>
        <span className="text-nerv-orange">
          {peakPrice}¢
        </span>
        <span className="text-nerv-brown">→</span>
        <span className="text-white font-medium">
          {nowPrice}¢
        </span>
      </div>
      
      {/* Stats row */}
      <div className="pl-7 flex items-center gap-4">
        {/* Change percentage */}
        <span
          className={`text-sm font-mono font-bold ${
            isPositive ? 'text-data-green' : 'text-alert-red'
          }`}
        >
          {isPositive ? '+' : ''}{change}%
        </span>
        
        {/* Volume */}
        <span className="text-xs text-nerv-rust font-mono">
          Vol: {formatVolume(volume)}
        </span>
        
        {/* Topic badge */}
        <span className="text-[10px] uppercase tracking-wider text-nerv-rust/70 bg-nerv-void-panel px-2 py-0.5 rounded">
          {topic}
        </span>
        
        {/* External link indicator */}
        <ExternalLink className="w-3 h-3 text-nerv-rust/50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
