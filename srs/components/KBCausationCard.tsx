/**
 * KB Causation Card
 * Floating card for AI-powered market causation analysis
 * Purple theme (financial intelligence family)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Brain, X, TrendingUp, TrendingDown, AlertCircle, ChevronDown, ChevronUp, Activity, Zap, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useKBCausation } from '@/hooks/useKBCausation';
import { usePolymarketData } from '@/hooks/useDeFiData';
import { CausationAnalysis, Domain } from '@/lib/kbCausation';

interface KBCausationCardProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Edge badge color based on magnitude
const getEdgeColor = (magnitude: number): string => {
  if (magnitude >= 0.10) return 'text-green-400 bg-green-500/20 border-green-500/40';
  if (magnitude >= 0.05) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
  return 'text-red-400 bg-red-500/20 border-red-500/40';
};

// Recommendation badge styling
const getRecommendationStyle = (action: string): string => {
  switch (action) {
    case 'predict':
      return 'bg-green-500/20 text-green-400 border-green-500/40';
    case 'monitor':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    case 'dismiss':
      return 'bg-red-500/20 text-red-400 border-red-500/40';
    default:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
  }
};

// Confidence bar width
const getConfidenceWidth = (confidence: number): string => {
  return `${Math.round(confidence * 100)}%`;
};

// Infer domain from market title
const inferDomain = (title: string): Domain => {
  const lower = title.toLowerCase();
  if (lower.includes('fda') || lower.includes('drug') || lower.includes('approval') || lower.includes('clinical')) return 'biotech';
  if (lower.includes('election') || lower.includes('vote') || lower.includes('trump') || lower.includes('biden') || lower.includes('war') || lower.includes('ukraine')) return 'geopolitics';
  if (lower.includes('bitcoin') || lower.includes('eth') || lower.includes('crypto') || lower.includes('etf')) return 'crypto';
  if (lower.includes('oil') || lower.includes('gold') || lower.includes('commodity')) return 'commodities';
  if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm') || lower.includes('model')) return 'ai';
  if (lower.includes('robot') || lower.includes('tesla') || lower.includes('vehicle')) return 'robotics';
  return 'geopolitics';
};

// Detect external events from market title
const detectExternalEvents = (title: string): Array<{ type: string; description: string; significance: number }> => {
  const events: Array<{ type: string; description: string; significance: number }> = [];
  const lower = title.toLowerCase();

  if (lower.includes('adcom') || lower.includes('advisory committee')) {
    events.push({ type: 'adcom', description: 'FDA Advisory Committee vote detected', significance: 0.9 });
  }
  if (lower.includes('pdufa') || lower.includes('approval date')) {
    events.push({ type: 'pdufa', description: 'PDUFA approval deadline', significance: 0.85 });
  }
  if (lower.includes('phase 3') || lower.includes('phase iii')) {
    events.push({ type: 'phase3', description: 'Phase 3 trial results', significance: 0.8 });
  }
  if (lower.includes('election') && lower.includes('2024')) {
    events.push({ type: 'election', description: '2024 election event', significance: 0.75 });
  }
  if (lower.includes('etf approval') || lower.includes('sec')) {
    events.push({ type: 'regulatory', description: 'Regulatory decision pending', significance: 0.85 });
  }

  return events;
};

export const KBCausationCard: React.FC<KBCausationCardProps> = ({ isOpen, onClose, position = 'top-right' }) => {
  const { analyze, loading, lastResult, isReady } = useKBCausation();
  const { events, loading: dataLoading } = usePolymarketData(isOpen);
  const [analysis, setAnalysis] = useState<CausationAnalysis | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeMarket = events.length > 0 ? events[currentIndex] : null;

  // Auto-analyze when market changes
  useEffect(() => {
    if (isOpen && isReady && activeMarket && !dataLoading) {
      const domain = inferDomain(activeMarket.title);
      const externalEvents = detectExternalEvents(activeMarket.title);
      
      analyze({
        asset: activeMarket.title.substring(0, 50),
        priceMove: { magnitude: (activeMarket.yesPrice - 0.5) * 2, timeframe: '24h' },
        domain,
        currentMarketPrice: activeMarket.yesPrice,
        externalEvents: externalEvents.map(e => ({
          type: e.type,
          description: e.description,
          timestamp: Date.now(),
          significance: e.significance
        }))
      }).then(result => {
        if (result) setAnalysis(result);
      });
    }
  }, [isOpen, isReady, activeMarket, dataLoading, analyze]);

  // Use last result if no explicit analysis
  useEffect(() => {
    if (lastResult && !analysis) {
      setAnalysis(lastResult);
    }
  }, [lastResult, analysis]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : events.length - 1));
    setAnalysis(null);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < events.length - 1 ? prev + 1 : 0));
    setAnalysis(null);
  };

  if (!isOpen) return null;

  const positionClasses = {
    'top-right': 'top-20 right-4',
    'top-left': 'top-20 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-80 bg-black/95 border border-purple-500/30 rounded-lg shadow-2xl shadow-purple-500/10 backdrop-blur-sm`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-purple-500/10 border-b border-purple-500/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-purple-400 font-mono text-sm font-bold tracking-wider">
            CAUSATION ENGINE
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-purple-500/20 rounded transition-colors"
        >
          <X className="w-4 h-4 text-purple-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Market Context */}
        {activeMarket && (
          <div className="bg-purple-500/5 border border-purple-500/20 rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-purple-300 text-xs font-mono">ANALYZING MARKET ({currentIndex + 1}/{events.length})</span>
              <div className="flex items-center gap-1">
                <button onClick={handlePrev} className="p-1 hover:bg-purple-500/20 rounded transition-colors">
                  <ChevronLeft className="w-3 h-3 text-purple-400" />
                </button>
                <button onClick={handleNext} className="p-1 hover:bg-purple-500/20 rounded transition-colors">
                  <ChevronRight className="w-3 h-3 text-purple-400" />
                </button>
              </div>
            </div>
            <div className="text-purple-200 text-sm font-medium leading-tight line-clamp-2">
              {activeMarket.title}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <span className="text-purple-400 text-xs">YES:</span>
                <span className="text-purple-300 text-sm font-mono font-bold">
                  {Math.round(activeMarket.yesPrice * 100)}¢
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-purple-400 text-xs">VOL:</span>
                <span className="text-purple-300 text-sm font-mono">
                  ${(activeMarket.volume / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
              <span className="text-purple-400 text-sm font-mono">ANALYZING PATTERNS...</span>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {!loading && analysis && (
          <>
            {/* Primary Catalyst */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400 text-xs font-mono">PRIMARY CATALYST</span>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/20 rounded p-3">
                <p className="text-purple-200 text-sm leading-relaxed">
                  {analysis.primaryCatalyst.event}
                </p>
                
                {/* Confidence Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-purple-400 text-xs font-mono">CONFIDENCE</span>
                    <span className="text-purple-300 text-xs font-mono">
                      {Math.round(analysis.primaryCatalyst.confidence * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-purple-500/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
                      style={{ width: getConfidenceWidth(analysis.primaryCatalyst.confidence) }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Edge Estimate */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-purple-400" />
                <span className="text-purple-400 text-xs font-mono">EDGE ESTIMATE</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded border ${getEdgeColor(analysis.edgeEstimate.magnitude)}`}>
                  <span className="font-mono font-bold text-lg">
                    {(analysis.edgeEstimate.magnitude * 100).toFixed(1)}%
                  </span>
                  <span className="text-xs ml-1 opacity-70">EDGE</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    {analysis.edgeEstimate.direction === 'up' ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className="text-purple-300 text-xs">
                      {analysis.edgeEstimate.direction.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-purple-400 text-xs leading-tight">
                    {analysis.edgeEstimate.reasoning}
                  </p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="space-y-2">
              <span className="text-purple-400 text-xs font-mono">RECOMMENDATION</span>
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border ${getRecommendationStyle(analysis.recommendation.action)}`}>
                <span className="font-mono font-bold tracking-wider">
                  {analysis.recommendation.action.toUpperCase()}
                </span>
                <span className="text-xs opacity-70">|</span>
                <span className="text-xs uppercase">{analysis.recommendation.urgency}</span>
              </div>
              <p className="text-purple-400 text-xs leading-relaxed">
                {analysis.recommendation.rationale}
              </p>
            </div>

            {/* Contributing Factors */}
            {analysis.contributingFactors.length > 0 && (
              <div className="space-y-2">
                <span className="text-purple-400 text-xs font-mono">CONTRIBUTING FACTORS</span>
                <div className="space-y-1">
                  {analysis.contributingFactors.map((factor, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-purple-300 truncate flex-1">{factor.factor}</span>
                      <span className="text-purple-400 font-mono text-xs">
                        {Math.round(factor.weight * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Historical Matches */}
            {analysis.historicalMatches.length > 0 && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowMatches(!showMatches)}
                  className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showMatches ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  <span className="text-xs font-mono">HISTORICAL MATCHES ({analysis.historicalMatches.length})</span>
                </button>
                
                {showMatches && (
                  <div className="space-y-2">
                    {analysis.historicalMatches.map((match, idx) => (
                      <div
                        key={idx}
                        className="bg-purple-500/5 border border-purple-500/10 rounded p-2 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-purple-300 truncate flex-1">{match.event}</span>
                          <span className={`ml-2 ${
                            match.outcome === 'Success' ? 'text-green-400' : 
                            match.outcome === 'Failure' ? 'text-red-400' : 'text-amber-400'
                          }`}>
                            {match.outcome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-purple-400">
                          <span>{match.date}</span>
                          {match.edge !== undefined && (
                            <span className={match.edge > 0 ? 'text-green-400' : 'text-red-400'}>
                              {match.edge > 0 ? '+' : ''}{(match.edge * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !analysis && !activeMarket && (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-purple-500/50 mx-auto mb-3" />
            <p className="text-purple-400 text-sm">Select a Polymarket event to analyze</p>
            <p className="text-purple-500/60 text-xs mt-1">
              Or enable the Polymarket Oracle to auto-analyze
            </p>
          </div>
        )}

        {/* Footer Stats */}
        <div className="pt-3 border-t border-purple-500/20">
          <div className="flex items-center justify-between text-xs text-purple-500/60">
            <span>KB ENGINE v1.0</span>
            <span className="font-mono">LOCAL EMBEDDINGS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KBCausationCard;
