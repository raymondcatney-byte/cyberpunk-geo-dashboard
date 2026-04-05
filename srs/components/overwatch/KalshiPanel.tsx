import { useState } from 'react';
import { Target, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { useKalshiMarkets } from '../../hooks/useKalshiMarkets';
import { KalshiMarketCard } from './KalshiMarketCard';
import { TOPIC_KEYS, getTopicDisplayName, type Topic } from '../../lib/kalshi-mapper';

export function KalshiPanel() {
  const [activeTopic, setActiveTopic] = useState<Topic | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const { markets, loading, error, refresh } = useKalshiMarkets({
    topic: activeTopic === 'all' ? null : activeTopic,
    search: debouncedSearch || undefined
  });
  
  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Simple debounce - could use useEffect with timeout for proper debouncing
    setTimeout(() => setDebouncedSearch(value), 300);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-nerv-void">
      {/* Header */}
      <div className="px-4 py-3 border-b border-nerv-brown bg-nerv-void-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-nerv-orange" />
            <h2 className="text-white font-mono font-semibold text-sm">Kalshi Markets</h2>
            <span className="text-nerv-rust text-xs">({markets.length})</span>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-nerv-rust border border-nerv-brown rounded hover:border-nerv-orange hover:text-nerv-orange transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <p className="text-nerv-rust text-[11px] mt-1">
          Regulated prediction markets • Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Controls */}
      <div className="px-4 py-3 border-b border-nerv-brown space-y-3">
        {/* Topic Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTopic('all')}
            className={`px-3 py-1.5 text-[10px] font-mono uppercase rounded border whitespace-nowrap transition-all ${
              activeTopic === 'all'
                ? 'bg-nerv-orange text-black border-nerv-orange font-bold'
                : 'bg-nerv-void-panel text-nerv-rust border-nerv-brown hover:border-nerv-orange'
            }`}
          >
            All
          </button>
          {TOPIC_KEYS.map((topic) => (
            <button
              key={topic}
              onClick={() => setActiveTopic(topic)}
              className={`px-3 py-1.5 text-[10px] font-mono uppercase rounded border whitespace-nowrap transition-all ${
                activeTopic === topic
                  ? 'bg-nerv-orange text-black border-nerv-orange font-bold'
                  : 'bg-nerv-void-panel text-nerv-rust border-nerv-brown hover:border-nerv-orange'
              }`}
            >
              {getTopicDisplayName(topic)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nerv-rust" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-nerv-void border border-nerv-brown rounded pl-9 pr-3 py-2 text-sm text-nerv-amber placeholder-nerv-rust/50 focus:outline-none focus:border-nerv-orange"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <div className="w-8 h-8 border-2 border-nerv-orange border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-mono">Loading markets...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust px-8">
            <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm font-mono">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 px-3 py-1 text-xs border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20 rounded"
            >
              Retry
            </button>
          </div>
        ) : markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-nerv-rust">
            <p className="text-sm font-mono">No markets found</p>
            <p className="text-[11px] text-nerv-rust/60 mt-1">
              Try adjusting filters or search
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {markets.map((market) => (
              <KalshiMarketCard key={market.id} market={market} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-nerv-brown bg-nerv-void-panel flex justify-between items-center text-[10px] text-nerv-rust font-mono">
        <span>
          {loading ? 'Loading...' : `${markets.length} markets`}
        </span>
        <span className="text-nerv-rust/60">
          Data: Mock (API key needed for live)
        </span>
      </div>
    </div>
  );
}
