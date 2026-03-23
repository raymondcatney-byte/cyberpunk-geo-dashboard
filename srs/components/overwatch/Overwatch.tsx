import { useEffect, useState, useMemo } from 'react';
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { Sidebar } from './Sidebar';
import { MarketList } from './MarketList';
import { DetailPanel } from './DetailPanel';
import { AnomalyDashboard } from './AnomalyDashboard';
import { usePolymarketOpportunities, type FilterPreset, type Opportunity } from '../../hooks/usePolymarketOpportunities';

interface OverwatchProps {
  dashboardUrl?: string;
}

function normalizeDashboardUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function Overwatch({ dashboardUrl }: OverwatchProps) {
  const [view, setView] = useState<'markets' | 'anomalies'>('markets');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [preset, setPreset] = useState<FilterPreset>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<Opportunity | null>(null);
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [effectiveDashboardUrl, setEffectiveDashboardUrl] = useState<string>('');

  // Initialize dashboard URL from props or localStorage
  useEffect(() => {
    const fromProps = normalizeDashboardUrl(dashboardUrl || '');
    if (fromProps) {
      setEffectiveDashboardUrl(fromProps);
      return;
    }
    const stored = typeof window !== 'undefined' 
      ? normalizeDashboardUrl(localStorage.getItem('overwatch_dashboard_url') || '') 
      : '';
    setEffectiveDashboardUrl(stored);
  }, [dashboardUrl]);

  // Debounce search query (fixes lag)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.toLowerCase().trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { opportunities, loading, error, refresh, lastUpdated } = usePolymarketOpportunities({
    preset,
    limit: 50,
    refreshInterval: 60000,
  });

  // Filter by category and search (with debouncing and multi-field search)
  const filteredOpportunities = useMemo(() => {
    // First filter by category
    let result = opportunities;
    if (selectedCategory !== 'ALL') {
      result = result.filter(opp => opp.market.category === selectedCategory);
    }
    
    // Then filter by search query (multi-field)
    if (debouncedQuery) {
      const q = debouncedQuery;
      result = result.filter(opp => {
        const m = opp.market;
        return (
          m.question?.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.slug?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q)
        );
      });
    }
    
    return result;
  }, [opportunities, selectedCategory, debouncedQuery]);

  const handleMarketClick = (opportunity: Opportunity) => {
    setSelectedMarket(opportunity);
  };

  const handleCloseDetail = () => {
    setSelectedMarket(null);
  };

  return (
    <div className="h-full flex flex-col bg-nerv-void">
      {/* Header with View Toggle */}
      <div className="h-[60px] border-b border-nerv-brown bg-nerv-void-panel flex items-center px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-nerv-orange font-mono text-sm font-bold tracking-wider">
            OVERWATCH
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 ml-4">
          <button
            onClick={() => setView('markets')}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-colors ${
              view === 'markets'
                ? 'bg-nerv-amber/20 border-nerv-amber text-nerv-amber'
                : 'border-nerv-brown text-nerv-rust hover:border-nerv-amber hover:text-nerv-amber'
            }`}
          >
            MARKETS
          </button>
          <button
            onClick={() => setView('anomalies')}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase border transition-colors ${
              view === 'anomalies'
                ? 'bg-nerv-amber/20 border-nerv-amber text-nerv-amber'
                : 'border-nerv-brown text-nerv-rust hover:border-nerv-amber hover:text-nerv-amber'
            }`}
          >
            ANOMALIES
          </button>
        </div>

        <div className="flex-1" />

        {/* Data Source Status */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          {loading ? (
            <span className="text-nerv-orange animate-pulse">LOADING...</span>
          ) : error ? (
            <span className="text-nerv-alert">API ERROR</span>
          ) : (
            <>
              <span className="text-green-500">● LIVE</span>
              <span className="text-nerv-rust">
                {opportunities.length} markets
              </span>
            </>
          )}
          {lastUpdated && (
            <span className="text-nerv-rust ml-2">
              {Math.floor((Date.now() - lastUpdated.getTime()) / 60000)}m ago
            </span>
          )}
        </div>
      </div>

      {/* Content based on view */}
      {view === 'markets' ? (
        <>
          {/* Filter Bar */}
          <FilterBar
            preset={preset}
            onPresetChange={setPreset}
            showBookmarksOnly={showBookmarksOnly}
            onBookmarksToggle={() => setShowBookmarksOnly(!showBookmarksOnly)}
          />

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <Sidebar opportunities={opportunities} />

            {/* Market List */}
            <div className="flex-1 overflow-hidden">
              <MarketList
                opportunities={filteredOpportunities}
                loading={loading}
                error={error}
                selectedMarket={selectedMarket}
                onMarketClick={handleMarketClick}
                onRetry={refresh}
              />
            </div>

            {/* Detail Panel */}
            {selectedMarket && (
              <DetailPanel
                opportunity={selectedMarket}
                onClose={handleCloseDetail}
              />
            )}
          </div>
        </>
      ) : (
        <AnomalyDashboard embedded />
      )}
    </div>
  );
}
