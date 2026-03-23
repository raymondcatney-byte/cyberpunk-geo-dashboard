import { useEffect, useState, useMemo } from 'react';
import { Header } from './Header';
import { FilterBar } from './FilterBar';
import { Sidebar } from './Sidebar';
import { MarketList } from './MarketList';
import { DetailPanel } from './DetailPanel';
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
      {/* Header */}
      <Header
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
        loading={loading}
        dashboardUrl={effectiveDashboardUrl}
      />

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
    </div>
  );
}
