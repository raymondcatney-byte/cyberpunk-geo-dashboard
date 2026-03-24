import { Settings2 } from 'lucide-react';

interface ThresholdControlProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
}

export function ThresholdControl({ threshold, onThresholdChange }: ThresholdControlProps) {
  return (
    <div className="px-4 py-3 border-b border-nerv-brown/30 bg-nerv-void-panel/30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-nerv-rust">
          <Settings2 className="w-4 h-4" />
          <span className="text-[11px] font-mono uppercase tracking-wider">
            Detection Threshold
          </span>
        </div>
        
        <div className="flex-1 flex items-center gap-3">
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={threshold}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
            className="flex-1 h-1.5 bg-nerv-brown rounded-lg appearance-none cursor-pointer accent-nerv-orange"
          />
          <span className="text-nerv-orange font-mono text-sm font-bold min-w-[48px] text-right">
            {threshold}%
          </span>
        </div>
      </div>
      
      <div className="flex justify-between text-[9px] text-nerv-rust/60 font-mono mt-1 px-1">
        <span>5%</span>
        <span>50%</span>
      </div>
    </div>
  );
}
