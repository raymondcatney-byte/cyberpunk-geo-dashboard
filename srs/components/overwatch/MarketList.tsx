import { AlertCircle, RefreshCw } from 'lucide-react';
import { MarketCard } from './MarketCard';
import type { Opportunity } from '../../hooks/usePolymarketOpportunities';

interface MarketListProps {
  opportunities: Opportunity[];
  loading: boolean;
  error: string | null;
  selectedMarket: Opportunity | null;
  onMarketClick: (opportunity: Opportunity) => void;
  onRetry: () => void;
}

export function MarketList({
  opportunities,
  loading,
  error,
  selectedMarket,
  onMarketClick,
  onRetry,
}: MarketListProps) {
  if (loading && opportunities.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 text-nerv-orange animate-spin mb-4" />
        <span className="text-nerv-orange font-mono text-sm">
          Fetching intelligence...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <AlertCircle className="w-12 h-12 text-nerv-alert mb-4" />
        <span className="text-nerv-alert font-mono text-sm mb-2">
          Connection Error
        </span>
        <span className="text-nerv-rust font-mono text-xs text-center mb-4">
          {error}
        </span>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange text-xs font-mono uppercase hover:bg-nerv-orange/20 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8">
        <span className="text-nerv-rust font-mono text-lg mb-2">No markets found</span>
        <span className="text-nerv-rust font-mono text-xs text-center">
          Try adjusting your filters or search terms
        </span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-nerv-brown/50">
        {opportunities.map((opportunity) => (
          <MarketCard
            key={opportunity.market.id}
            opportunity={opportunity}
            isSelected={selectedMarket?.market.id === opportunity.market.id}
            onClick={() => onMarketClick(opportunity)}
          />
        ))}
      </div>
    </div>
  );
}
