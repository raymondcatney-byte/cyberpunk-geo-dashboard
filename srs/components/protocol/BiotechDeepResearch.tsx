import { useState, useCallback } from 'react';
import { Search, FlaskConical, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface BiotechSource {
  status: string;
  data: any[];
  count: number;
  error?: string;
}

interface BiotechResults {
  sources: Record<string, BiotechSource>;
  meta: {
    latency: number;
    timestamp: string;
  };
}

interface BiotechDeepResearchProps {
  results: BiotechResults | null;
  loading: boolean;
  error: string | null;
  onSearch: (query: string, category: string) => void;
}

const CATEGORIES = [
  { key: 'all', label: 'All Sources' },
  { key: 'supplements', label: 'Supplements' },
  { key: 'compounds', label: 'Compounds' },
  { key: 'trials', label: 'Clinical Trials' },
  { key: 'protocols', label: 'Protocols' },
];

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  examine: {
    bg: 'bg-green-950/30',
    border: 'border-green-800/50',
    text: 'text-green-400',
    badge: 'bg-green-900/50 text-green-400',
  },
  chembl: {
    bg: 'bg-blue-950/30',
    border: 'border-blue-800/50',
    text: 'text-blue-400',
    badge: 'bg-blue-900/50 text-blue-400',
  },
  clinicaltrials: {
    bg: 'bg-amber-950/30',
    border: 'border-amber-800/50',
    text: 'text-amber-400',
    badge: 'bg-amber-900/50 text-amber-400',
  },
  diybiohacking: {
    bg: 'bg-purple-950/30',
    border: 'border-purple-800/50',
    text: 'text-purple-400',
    badge: 'bg-purple-900/50 text-purple-400',
  },
  wikidata: {
    bg: 'bg-cyan-950/30',
    border: 'border-cyan-800/50',
    text: 'text-cyan-400',
    badge: 'bg-cyan-900/50 text-cyan-400',
  },
};

const SOURCE_NAMES: Record<string, string> = {
  examine: 'Examine.com',
  chembl: 'ChEMBL',
  clinicaltrials: 'ClinicalTrials.gov',
  diybiohacking: 'DIY Biohacking Wiki',
  wikidata: 'Wikidata',
};

export function BiotechDeepResearch({ results, loading, error, onSearch }: BiotechDeepResearchProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), category);
    }
  }, [query, category, onSearch]);

  const toggleSource = useCallback((source: string) => {
    setExpandedSources(prev => ({ ...prev, [source]: !prev[source] }));
  }, []);

  const hasResults = results && Object.values(results.sources).some(s => s.status === 'success' && s.count > 0);
  const totalResults = results 
    ? Object.values(results.sources).reduce((sum, s) => sum + (s.status === 'success' ? s.count : 0), 0)
    : 0;

  return (
    <div className="space-y-3">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-nerv-rust" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search supplements, compounds, protocols..."
              className="w-full bg-nerv-void border border-nerv-brown pl-8 pr-3 py-2 text-[11px] text-nerv-amber placeholder-nerv-rust/50 focus:outline-none focus:border-nerv-orange"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-nerv-void border border-nerv-brown px-2 py-2 text-[11px] text-nerv-amber focus:outline-none focus:border-nerv-orange"
          >
            {CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-3 py-2 bg-nerv-orange/20 border border-nerv-orange text-nerv-orange text-[11px] hover:bg-nerv-orange/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="border border-nerv-amber/30 bg-nerv-amber/10 p-2 text-[10px] text-nerv-amber">
          {error}
        </div>
      )}

      {/* Results Summary */}
      {results && !loading && (
        <div className="text-[10px] text-nerv-rust">
          Found {totalResults} results in {Object.values(results.sources).filter(s => s.status === 'success').length} sources 
          ({results.meta.latency}ms)
        </div>
      )}

      {/* Results by Source */}
      {hasResults && (
        <div className="space-y-2">
          {Object.entries(results!.sources)
            .filter(([_, source]) => source.status === 'success' && source.count > 0)
            .map(([sourceName, source]) => {
              const colors = SOURCE_COLORS[sourceName] || SOURCE_COLORS.wikidata;
              const isExpanded = expandedSources[sourceName] !== false; // Default expanded

              return (
                <div 
                  key={sourceName}
                  className={`border ${colors.border} ${colors.bg}`}
                >
                  {/* Source Header */}
                  <button
                    onClick={() => toggleSource(sourceName)}
                    className="w-full flex items-center justify-between p-2 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FlaskConical className={`h-3.5 w-3.5 ${colors.text}`} />
                      <span className={`text-[11px] font-medium ${colors.text}`}>
                        {SOURCE_NAMES[sourceName] || sourceName}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 ${colors.badge}`}>
                        {source.count}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-nerv-rust" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-nerv-rust" />
                    )}
                  </button>

                  {/* Source Results */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-1">
                      {source.data.slice(0, 5).map((item: any, idx: number) => (
                        <ResultCard key={idx} item={item} source={sourceName} colors={colors} />
                      ))}
                      {source.count > 5 && (
                        <div className="text-[9px] text-nerv-rust text-center py-1">
                          +{source.count - 5} more results
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Empty State */}
      {results && !loading && !hasResults && (
        <div className="text-center py-4 text-[11px] text-nerv-rust">
          No results found. Try a different search term.
        </div>
      )}

      {/* Initial State */}
      {!results && !loading && (
        <div className="text-center py-4 text-[11px] text-nerv-rust">
          Search across Examine.com, ChEMBL, ClinicalTrials.gov, and more.
        </div>
      )}
    </div>
  );
}

function ResultCard({ item, source, colors }: { item: any; source: string; colors: any }) {
  const getTitle = () => {
    switch (source) {
      case 'examine':
        return item.name;
      case 'chembl':
        return `${item.name} (${item.id})`;
      case 'clinicaltrials':
        return item.title;
      case 'diybiohacking':
        return item.title;
      case 'wikidata':
        return item.label;
      default:
        return 'Unknown';
    }
  };

  const getDescription = () => {
    switch (source) {
      case 'examine':
        return item.summary?.slice(0, 150) + '...' || 'No summary available';
      case 'chembl':
        return `${item.formula || 'N/A'} | MW: ${item.mw || 'N/A'} | Phase: ${item.max_phase || 'N/A'}`;
      case 'clinicaltrials':
        return `Status: ${item.status} | Phase: ${item.phase}`;
      case 'diybiohacking':
        return item.content?.slice(0, 150) + '...' || 'No preview available';
      case 'wikidata':
        return item.description || 'No description available';
      default:
        return '';
    }
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-nerv-brown/50 bg-nerv-void/50 p-2 hover:border-nerv-orange/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-[10px] font-medium ${colors.text} truncate`}>
            {getTitle()}
          </div>
          <div className="mt-0.5 text-[9px] text-nerv-rust line-clamp-2">
            {getDescription()}
          </div>
        </div>
        <ExternalLink className="h-3 w-3 text-nerv-rust opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </div>
    </a>
  );
}
