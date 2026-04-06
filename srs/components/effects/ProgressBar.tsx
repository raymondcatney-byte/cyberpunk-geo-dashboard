import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showValue?: boolean;
}

export function ProgressBar({ 
  value, 
  max = 100, 
  className = '',
  showValue = false 
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 bg-[var(--void-panel)] border border-[var(--steel-faint)]">
        <div 
          className="progress-fill h-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <div className="mt-1 text-[10px] text-[var(--steel-dim)] font-mono">
          {percentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
