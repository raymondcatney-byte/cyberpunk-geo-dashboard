import React from 'react';

interface MagiDotsProps {
  className?: string;
  showLabel?: boolean;
}

export function MagiDots({ className = '', showLabel = false }: MagiDotsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-[10px] uppercase tracking-wider text-[var(--steel-dim)]">
          MAGI
        </span>
      )}
      <div className="magi-dots">
        <div className="magi-dot magi-balthasar" title="MAGI-1 BALTHASAR" />
        <div className="magi-dot magi-casper" title="MAGI-2 CASPER" />
        <div className="magi-dot magi-melchior" title="MAGI-3 MELCHIOR" />
      </div>
    </div>
  );
}

export default MagiDots;
