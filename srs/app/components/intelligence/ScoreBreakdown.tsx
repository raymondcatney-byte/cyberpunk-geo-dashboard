import type { MarketIntelligence } from '../../lib/intelligence';

interface ScoreBreakdownProps {
  intelligence: MarketIntelligence;
  compact?: boolean;
}

export function ScoreBreakdown({ intelligence, compact = false }: ScoreBreakdownProps) {
  const scores = [
    { label: 'Mispricing', score: intelligence.mispricingScore, color: 'var(--wire-cyan)', dimColor: 'var(--wire-cyan-dim)' },
    { label: 'Volume', score: intelligence.volumeAnomalyScore, color: 'var(--nerv-orange)', dimColor: 'var(--nerv-orange-dim)' },
    { label: 'Liquidity', score: intelligence.liquidityEfficiency, color: 'var(--data-green)', dimColor: 'var(--data-green-dim)' },
    { label: 'Sentiment', score: intelligence.sentimentDivergence, color: 'var(--nerv-orange-hot)', dimColor: 'var(--nerv-orange-dim)' },
    { label: 'Time', score: intelligence.timeUrgency, color: 'var(--alert-red)', dimColor: 'var(--alert-red-dim)' },
  ];

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'A+': return 'var(--data-green)';
      case 'A': return 'var(--data-green-dim)';
      case 'B+': return 'var(--wire-cyan)';
      case 'B': return 'var(--wire-cyan-dim)';
      case 'C': return 'var(--nerv-orange)';
      default: return 'var(--steel-dim)';
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span 
          className="text-lg font-bold"
          style={{ color: getRatingColor(intelligence.opportunityRating), fontFamily: 'var(--font-mono)' }}
        >
          {intelligence.opportunityRating}
        </span>
        <span 
          className="text-sm"
          style={{ color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}
        >
          {intelligence.compositeScore}
        </span>
        <div className="flex gap-1">
          {scores.slice(0, 3).map(s => (
            <div
              key={s.label}
              className="w-1.5 h-4"
              style={{ 
                background: s.score > 60 ? s.color : 'var(--void-raised)',
                border: `1px solid ${s.score > 60 ? s.dimColor : 'var(--steel-line)'}`
              }}
              title={`${s.label}: ${s.score}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Composite Score Header */}
      <div 
        className="flex items-center justify-between p-3"
        style={{ 
          background: 'var(--void-panel)',
          border: '1px solid var(--nerv-orange)'
        }}
      >
        <div>
          <span 
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}
          >
            Opportunity Rating
          </span>
          <div 
            className="text-3xl font-bold"
            style={{ 
              color: getRatingColor(intelligence.opportunityRating),
              fontFamily: 'var(--font-display)',
              transform: 'scaleX(0.85)',
              transformOrigin: 'left'
            }}
          >
            {intelligence.opportunityRating}
          </div>
        </div>
        <div className="text-right">
          <span 
            className="text-xs uppercase tracking-wider"
            style={{ color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}
          >
            Composite Score
          </span>
          <div 
            className="text-3xl font-bold"
            style={{ 
              color: 'var(--nerv-orange)',
              fontFamily: 'var(--font-display)',
              transform: 'scaleX(0.85)',
              transformOrigin: 'right'
            }}
          >
            {intelligence.compositeScore}
          </div>
        </div>
      </div>

      {/* Individual Scores */}
      <div className="space-y-2">
        {scores.map(({ label, score, color, dimColor }) => (
          <div key={label} className="flex items-center gap-3">
            <span 
              className="w-20 text-xs uppercase"
              style={{ color: 'var(--nerv-orange)', fontFamily: 'var(--font-mono)' }}
            >
              {label}
            </span>
            <div 
              className="flex-1 h-2"
              style={{ 
                background: 'var(--void-panel)',
                border: '1px solid var(--nerv-orange-dim)'
              }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{ 
                  width: `${score}%`,
                  background: score > 60 ? color : dimColor
                }}
              />
            </div>
            <span 
              className="w-8 text-right text-sm"
              style={{ 
                color: score > 60 ? color : 'var(--steel-dim)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {score}
            </span>
          </div>
        ))}
      </div>

      {/* Primary Signal */}
      <div 
        className="pt-2"
        style={{ borderTop: '1px solid var(--nerv-orange-dim)' }}
      >
        <span 
          className="text-xs uppercase tracking-wider"
          style={{ color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}
        >
          Primary Signal
        </span>
        <div 
          className="text-sm capitalize"
          style={{ color: 'var(--data-green)', fontFamily: 'var(--font-mono)' }}
        >
          {intelligence.primarySignal.replace(/_/g, ' ')}
        </div>
      </div>
    </div>
  );
}
