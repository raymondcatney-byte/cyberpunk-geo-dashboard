import { useOpportunities } from '../../hooks/useOpportunities';
import { ScoreBreakdown } from './ScoreBreakdown';
import { RefreshCw, TrendingUp, AlertCircle } from 'lucide-react';

interface OpportunityStreamProps {
  minScore?: number;
  categories?: string[];
  limit?: number;
  className?: string;
}

export function OpportunityStream({ minScore = 60, categories, limit = 12, className = '' }: OpportunityStreamProps) {
  const { opportunities, loading, error, refresh, lastUpdated } = useOpportunities({
    minScore,
    categories,
    limit,
    refreshInterval: 60000,
  });

  if (loading && opportunities.length === 0) {
    return (
      <div className={`nerv-panel p-4 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6" style={{ color: 'var(--nerv-orange)', animation: 'spin 1s linear infinite' }} />
          <span className="ml-2" style={{ color: 'var(--nerv-orange)', fontFamily: 'var(--font-mono)' }}>
            Scanning for opportunities...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`nerv-panel nerv-panel-alert p-4 ${className}`}>
        <div className="flex items-center" style={{ color: 'var(--alert-red)' }}>
          <AlertCircle className="w-5 h-5 mr-2" />
          <span style={{ fontFamily: 'var(--font-mono)' }}>Failed to load opportunities</span>
        </div>
        <button
          onClick={refresh}
          className="nerv-button mt-2"
          style={{ fontSize: '10px', padding: '4px 12px' }}
        >
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className={`nerv-panel ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3"
        style={{ 
          borderBottom: '1px solid var(--nerv-orange)',
          background: 'var(--void-panel)'
        }}
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: 'var(--nerv-orange)' }} />
          <span 
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: 'var(--nerv-orange)', fontFamily: 'var(--font-display)', transform: 'scaleX(0.9)' }}
          >
            Opportunity Stream
          </span>
          <span style={{ fontSize: '11px', color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}>
            ({opportunities.length} markets)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span style={{ fontSize: '10px', color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}>
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 transition-colors"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nerv-orange-fill)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <RefreshCw 
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} 
              style={{ color: 'var(--nerv-orange)' }} 
            />
          </button>
        </div>
      </div>

      {/* Opportunity List */}
      <div className="max-h-[400px] overflow-y-auto">
        {opportunities.length === 0 ? (
          <div 
            className="p-8 text-center"
            style={{ color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}
          >
            No high-signal opportunities found.
            <br />
            <span style={{ fontSize: '11px' }}>Try lowering the minimum score threshold.</span>
          </div>
        ) : (
          <div>
            {opportunities.map((opp, index) => (
              <div
                key={opp.market.id}
                className="p-3 cursor-pointer group"
                style={{ 
                  borderBottom: '1px solid rgba(255, 152, 48, 0.2)',
                  transition: 'background 150ms ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--nerv-orange-fill)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Rank & Title */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '11px', color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}>
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      {opp.market.category && (
                        <span 
                          className="text-[10px] px-1.5 py-0.5 uppercase"
                          style={{
                            background: 'var(--nerv-orange-fill)',
                            color: 'var(--nerv-orange)',
                            border: '1px solid var(--nerv-orange-dim)',
                            fontFamily: 'var(--font-mono)'
                          }}
                        >
                          {opp.market.category}
                        </span>
                      )}
                    </div>
                    <h4 
                      className="mt-1 text-sm line-clamp-2 group-hover:opacity-80"
                      style={{ color: 'var(--steel)', fontFamily: 'var(--font-mono)' }}
                    >
                      {opp.market.title}
                    </h4>
                    
                    {/* Match Reasons */}
                    {opp.matchReasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {opp.matchReasons.slice(0, 3).map((reason, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5"
                            style={{
                              color: 'var(--steel-dim)',
                              background: 'var(--void-raised)',
                              border: '1px solid var(--steel-line)',
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scores */}
                  <div className="shrink-0">
                    <ScoreBreakdown intelligence={opp.intelligence} compact />
                  </div>
                </div>

                {/* Price & Volume */}
                <div 
                  className="mt-2 flex items-center gap-4 text-xs"
                  style={{ color: 'var(--steel-dim)', fontFamily: 'var(--font-mono)' }}
                >
                  <span>
                    YES: <span style={{ color: 'var(--data-green)' }}>{(opp.market.yesPrice * 100).toFixed(1)}%</span>
                  </span>
                  <span>
                    VOL: <span style={{ color: 'var(--data-green)' }}>${(opp.market.volume / 1000000).toFixed(1)}M</span>
                  </span>
                  {opp.market.endDate && (
                    <span>
                      ENDS: <span style={{ color: 'var(--data-green)' }}>
                        {new Date(opp.market.endDate).toLocaleDateString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
