import { useState, useCallback } from 'react';
import { Search, RefreshCw, Brain, AlertTriangle, FileText, FlaskConical, Beaker } from 'lucide-react';
import { ResearchPaperCard } from './ResearchPaperCard';
import { ClinicalTrialCard } from './ClinicalTrialCard';

interface SynthesisCategory {
  title: string;
  relevance: string;
  keyFinding: string;
  url: string;
}

interface SynthesisCompound {
  name: string;
  mechanism: string;
  status: string;
}

interface SynthesisResult {
  summary: string;
  categories: {
    papers: SynthesisCategory[];
    trials: SynthesisCategory[];
    compounds: SynthesisCompound[];
  };
  keyInsights: string[];
  evidenceQuality: 'high' | 'moderate' | 'low';
}

interface SourceData {
  status: string;
  data: any[];
  count: number;
  error?: string;
}

interface SourcesResult {
  europepmc: SourceData | null;
  clinicaltrials: SourceData | null;
}

export function ResearchFeedPanel() {
  const [query, setQuery] = useState('');
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingSynthesis, setLoadingSynthesis] = useState(false);
  const [sources, setSources] = useState<SourcesResult | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisResult | null>(null);
  const [synthesisError, setSynthesisError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'papers' | 'trials' | 'compounds'>('all');

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setLoadingSources(true);
    setLoadingSynthesis(true);
    setSources(null);
    setSynthesis(null);
    setSynthesisError(null);

    try {
      const response = await fetch('/api/biotech/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: query.trim(), 
          category: 'feed',
          synthesize: true 
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Immediately display raw source data
      setSources(data.sources);
      setLoadingSources(false);

      // Handle synthesis (may be null on failure)
      if (data.synthesis) {
        setSynthesis(data.synthesis);
      } else if (data.synthesisError) {
        setSynthesisError(data.synthesisError);
      }
      setLoadingSynthesis(false);
    } catch (err) {
      setLoadingSources(false);
      setLoadingSynthesis(false);
      setSynthesisError(err instanceof Error ? err.message : 'Search failed');
    }
  }, [query]);

  const getEvidenceQualityStyles = (quality: string) => {
    switch (quality) {
      case 'high':
        return 'border-green-500/50 text-green-400 bg-green-400/10';
      case 'moderate':
        return 'border-yellow-500/50 text-yellow-400 bg-yellow-400/10';
      case 'low':
        return 'border-orange-500/50 text-orange-400 bg-orange-400/10';
      default:
        return 'border-nerv-brown text-nerv-rust bg-nerv-void';
    }
  };

  const hasResults = sources && (
    (sources.europepmc?.status === 'success' && sources.europepmc.count > 0) ||
    (sources.clinicaltrials?.status === 'success' && sources.clinicaltrials.count > 0)
  );

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nerv-rust" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Europe PMC + ClinicalTrials.gov..."
              className="w-full bg-nerv-void-panel border border-nerv-brown rounded pl-8 pr-3 py-2 text-xs text-nerv-amber placeholder-nerv-rust/50 focus:border-nerv-orange focus:outline-none transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loadingSources || !query.trim()}
            className="px-3 py-2 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange rounded text-[10px] uppercase tracking-wider hover:bg-nerv-orange/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
          >
            {loadingSources ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
        <p className="text-[9px] text-nerv-rust/70 font-mono">
          Queries Europe PMC (papers) + ClinicalTrials.gov (trials), then Groq synthesizes findings
        </p>
      </form>

      {/* Error State */}
      {synthesisError && !sources && (
        <div className="border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>{synthesisError}</span>
        </div>
      )}

      {/* Results Area */}
      {sources && (
        <div className="space-y-4">
          {/* Groq Synthesis Panel */}
          <div className="nerv-panel-angular border border-nerv-orange/30">
            <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-orange/20 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-nerv-orange" />
                <span className="text-[10px] uppercase tracking-wider text-nerv-orange font-mono">
                  Groq Synthesis
                </span>
              </div>
              {loadingSynthesis && (
                <span className="text-[9px] text-nerv-orange animate-pulse font-mono">
                  ANALYZING...
                </span>
              )}
            </div>

            <div className="p-3">
              {loadingSynthesis && !synthesis && (
                <div className="flex items-center gap-3 text-nerv-rust">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <div>
                    <p className="text-[11px]">Analyzing research findings...</p>
                    <p className="text-[9px] text-nerv-rust/60">This may take 3-5 seconds</p>
                  </div>
                </div>
              )}

              {synthesis && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500 space-y-3">
                  {/* Summary */}
                  <p className="text-nerv-amber text-[12px] leading-relaxed">
                    {synthesis.summary}
                  </p>

                  {/* Key Insights */}
                  {synthesis.keyInsights.length > 0 && (
                    <div className="space-y-1">
                      {synthesis.keyInsights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-nerv-orange mt-1">›</span>
                          <p className="text-[10px] text-nerv-rust flex-1">{insight}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Evidence Quality */}
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 text-[9px] uppercase tracking-wider border ${getEvidenceQualityStyles(synthesis.evidenceQuality)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    Evidence Quality: {synthesis.evidenceQuality}
                  </div>
                </div>
              )}

              {synthesisError && sources && (
                <div className="flex items-start gap-2 text-[11px] text-nerv-rust">
                  <AlertTriangle className="w-4 h-4 text-nerv-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p>Synthesis unavailable.</p>
                    <p className="text-nerv-rust/60 text-[10px] mt-1">
                      Showing raw results only. Error: {synthesisError}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1">
            {(['all', 'papers', 'trials'] as const).map((cat) => {
              const counts = {
                all: (sources.europepmc?.count || 0) + (sources.clinicaltrials?.count || 0),
                papers: sources.europepmc?.count || 0,
                trials: sources.clinicaltrials?.count || 0,
              };

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider border transition-all ${
                    activeCategory === cat
                      ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                      : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
                  }`}
                >
                  {cat} ({counts[cat]})
                </button>
              );
            })}
          </div>

          {/* Results List */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {/* Papers Section */}
            {(activeCategory === 'all' || activeCategory === 'papers') &&
              sources.europepmc?.status === 'success' &&
              sources.europepmc.data.length > 0 && (
                <div className="border border-nerv-brown/50">
                  <div className="px-3 py-2 bg-nerv-void-panel border-b border-nerv-brown/30 flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-nerv-orange" />
                    <span className="text-[10px] text-nerv-orange uppercase tracking-wider font-mono">
                      Research Papers ({sources.europepmc.count})
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {sources.europepmc.data.map((paper) => (
                      <ResearchPaperCard key={paper.pmid} paper={paper} />
                    ))}
                  </div>
                </div>
              )}

            {/* Trials Section */}
            {(activeCategory === 'all' || activeCategory === 'trials') &&
              sources.clinicaltrials?.status === 'success' &&
              sources.clinicaltrials.data.length > 0 && (
                <div className="border border-nerv-brown/50">
                  <div className="px-3 py-2 bg-nerv-void-panel border-b border-nerv-brown/30 flex items-center gap-2">
                    <FlaskConical className="w-3.5 h-3.5 text-nerv-orange" />
                    <span className="text-[10px] text-nerv-orange uppercase tracking-wider font-mono">
                      Clinical Trials ({sources.clinicaltrials.count})
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {sources.clinicaltrials.data.map((trial) => (
                      <ClinicalTrialCard key={trial.id} trial={trial} />
                    ))}
                  </div>
                </div>
              )}

            {/* Compounds Section (from synthesis) */}
            {(activeCategory === 'all' || activeCategory === 'compounds') &&
              synthesis?.categories.compounds.length > 0 && (
                <div className="border border-nerv-brown/50">
                  <div className="px-3 py-2 bg-nerv-void-panel border-b border-nerv-brown/30 flex items-center gap-2">
                    <Beaker className="w-3.5 h-3.5 text-nerv-orange" />
                    <span className="text-[10px] text-nerv-orange uppercase tracking-wider font-mono">
                      Compounds ({synthesis.categories.compounds.length})
                    </span>
                  </div>
                  <div className="p-2 space-y-2">
                    {synthesis.categories.compounds.map((compound, idx) => (
                      <div
                        key={idx}
                        className="border border-nerv-brown/30 p-2.5 bg-nerv-void/50"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] text-nerv-amber font-medium">
                            {compound.name}
                          </h4>
                          <span className="text-[9px] text-nerv-rust border border-nerv-brown/50 px-1.5 py-0.5">
                            {compound.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-nerv-rust mt-1">
                          {compound.mechanism}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Empty State */}
            {!hasResults && (
              <div className="text-center py-8 border border-nerv-brown/30">
                <p className="text-[11px] text-nerv-rust">No results found</p>
                <p className="text-[9px] text-nerv-rust/60 mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
