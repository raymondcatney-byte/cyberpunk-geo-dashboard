import { useState, useEffect } from 'react';
import {
  Shield,
  Target,
  Clock,
  TrendingUp,
  Brain,
  Activity,
  Lock,
  Settings,
  MessageSquare,
  Database,
  Crosshair,
  Radar,
  Ghost,
  Search,
  RefreshCw,
  Beaker
} from 'lucide-react';
import { Protocol, DEFAULT_PROTOCOLS } from '../config/persona';
import { searchPolymarketMarkets, type PolymarketMarketResult } from '../lib/polymarket';
import { researchBiotechQuery, type ResearchResult } from '../lib/biotechResearch';
import { ResearchResults } from './protocol/ResearchResults';
import { 
  extractBiomarkers, 
  consultWayneProtocol, 
  formatBiomarkers, 
  getBiomarkerColor,
  PROTOCOL_TEMPLATES,
  type ParsedBiomarkers,
  type ConsultationResult 
} from '../lib/protocolConsultant';
import { getTradingSnapshot, type TradingPolymarketMarket } from '../lib/trading-intel';
import { MarketDetail } from './MarketDetail';
import { IntelligentMarketSearch, OpportunityStreamV2 } from './intelligence';
import { NewsBroadcast } from './NewsBroadcast';
import { GitHubReleasesFeed } from './GitHubReleasesFeed';
import { DeFiSearchModule } from './DeFiSearchModule';
import { PolymarketOracleCard } from './PolymarketOracleCard';
import { DeFiYieldRadar } from './DeFiYieldRadar';
import { OnChainWhaleWatcher } from './OnChainWhaleWatcher';
import type { SearchResult } from '../lib/intelligence';

type TabType = 'communications' | 'protocols' | 'intel' | 'warroom' | 'overwatch' | 'settings' | 'agent';

interface HUDProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  protocols?: Protocol[];
  onProtocolSelect?: (protocol: Protocol) => void;

  // Comms: Watchtower objective search control (owned by parent)
  objectiveQuery: string;
  setObjectiveQuery: (q: string) => void;
  onObjectiveSubmit: () => void;
  objectiveLoading: boolean;
  objectiveError: string | null;
  objectiveResultCount: number;

  // Protocols: Protocol Consultant (left sidebar)
  consultantQuery?: string;
  setConsultantQuery?: (q: string) => void;
  onConsultantSubmit?: () => void;
  consultantLoading?: boolean;
  consultantError?: string | null;

  // WarRoom layer toggles
  dataLayers?: { satellites: boolean; earthquakes: boolean };
  financialLayers?: { polymarket: boolean; whales: boolean; yields: boolean; causation: boolean };
  onToggleDataLayer?: (layer: 'satellites' | 'earthquakes') => void;
  onToggleFinancialLayer?: (layer: 'polymarket' | 'whales' | 'yields' | 'causation') => void;
}

type ObjectiveSearchResult = PolymarketMarketResult;

export function HUD({
  activeTab,
  setActiveTab,
  protocols: propProtocols,
  onProtocolSelect,
  objectiveQuery,
  setObjectiveQuery,
  onObjectiveSubmit,
  objectiveLoading,
  objectiveError,
  objectiveResultCount,
  consultantQuery = '',
  setConsultantQuery = () => {},
  onConsultantSubmit = () => {},
  consultantLoading = false,
  consultantError = null,
  dataLayers,
  financialLayers,
  onToggleDataLayer,
  onToggleFinancialLayer,
}: HUDProps) {
  const [time, setTime] = useState(new Date());
  const [internalProtocols, setInternalProtocols] = useState<Protocol[]>(DEFAULT_PROTOCOLS);

  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [marketSearchResults, setMarketSearchResults] = useState<ObjectiveSearchResult[]>([]);
  const [marketSearchLoading, setMarketSearchLoading] = useState(false);
  const [marketSearchError, setMarketSearchError] = useState<string | null>(null);
  const [marketSearchTotal, setMarketSearchTotal] = useState<number>(0);
  const [marketSearchNextPage, setMarketSearchNextPage] = useState<number | undefined>(undefined);
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarketResult | null>(null);
  
  // Biotech Research State
  const [researchMode, setResearchMode] = useState<'research' | 'consult'>('research');
  const [researchQuery, setResearchQuery] = useState('');
  const [researchResult, setResearchResult] = useState<ResearchResult | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  
  // Wayne Protocol Consult State
  const [consultQuery, setConsultQuery] = useState('');
  const [consultResult, setConsultResult] = useState<ConsultationResult | null>(null);
  const [consultLoading, setConsultLoading] = useState(false);
  const [parsedBiomarkers, setParsedBiomarkers] = useState<ParsedBiomarkers>({});
  // Curated markets from trading snapshot (topic-focused)
  const [curatedMarkets, setCuratedMarkets] = useState<TradingPolymarketMarket[]>([]);
  const [curatedMarketsLoading, setCuratedMarketsLoading] = useState(false);
  // Use prop protocols if provided, otherwise use internal
  const protocols = propProtocols || internalProtocols;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch curated topic-focused markets for Comms tab
  useEffect(() => {
    const fetchCurated = async () => {
      setCuratedMarketsLoading(true);
      try {
        const snapshot = await getTradingSnapshot();
        if (snapshot.polymarket && snapshot.polymarket.length > 0) {
          setCuratedMarkets(snapshot.polymarket);
        }
      } catch (err) {
        console.error('Failed to fetch curated markets:', err);
      } finally {
        setCuratedMarketsLoading(false);
      }
    };
    
    fetchCurated();
    // Refresh every 5 minutes
    const interval = setInterval(fetchCurated, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleProtocol = (id: string) => {
    if (propProtocols && onProtocolSelect) {
      const protocol = protocols.find((p) => p.id === id);
      if (protocol) {
        onProtocolSelect(protocol);
      }
    } else {
      setInternalProtocols((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, status: p.status === 'completed' ? 'pending' : 'completed' } : p
        )
      );
    }
  };

  const handleProtocolClick = (protocol: Protocol) => {
    if (onProtocolSelect) {
      onProtocolSelect(protocol);
    }
  };

  const completedCount = protocols.filter((p) => p.status === 'completed').length;
  const progress = protocols.length > 0 ? (completedCount / protocols.length) * 100 : 0;

  const runMarketSearch = async (opts?: { append?: boolean }) => {
    const query = marketSearchQuery.trim();
    if (!query) return;

    setMarketSearchLoading(true);
    setMarketSearchError(null);
    if (!opts?.append) {
      setMarketSearchResults([]);
      setMarketSearchTotal(0);
      setMarketSearchNextPage(undefined);
    }

    try {
      const page = opts?.append && marketSearchNextPage ? marketSearchNextPage : 1;
      const { events, total, nextPage } = await searchPolymarketMarkets(query, { limit: 20, page });

      setMarketSearchTotal(total);
      setMarketSearchNextPage(nextPage);

      setMarketSearchResults((prev) => {
        if (!opts?.append) return events;
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const e of events) {
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          merged.push(e);
        }
        return merged;
      });

      if (!events.length && !opts?.append) {
        setMarketSearchError('No matching active markets found.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed.';
      setMarketSearchError(`Market intel unavailable. ${message}`);
    } finally {
      setMarketSearchLoading(false);
    }
  };

  const loadMoreMarkets = async () => {
    if (!marketSearchNextPage || marketSearchLoading) return;
    await runMarketSearch({ append: true });
  };

  return (
    <div className="h-full flex flex-col nerv-nav">
      {/* Header - Clean */}
      <div className="p-4 border-b border-nerv-brown">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="nerv-title" style={{ fontSize: '18px', marginBottom: 0, borderBottom: 'none' }}>
              GEO DASHBOARD
            </h1>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono text-nerv-orange">{time.toLocaleTimeString('en-US', { hour12: false })}</div>
            <div className="text-xs text-nerv-rust" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: '2-digit' })}
            </div>
          </div>
        </div>


      </div>

      {/* Navigation - Horizontal */}
      <div className="grid grid-cols-3 sm:grid-cols-7 border-b border-nerv-brown">
        {([
          { key: 'communications', label: 'Comms', icon: MessageSquare },
          { key: 'protocols', label: 'Protocols', icon: Activity },
          { key: 'intel', label: 'Intel', icon: Database },
          { key: 'warroom', label: 'War Room', icon: Crosshair },
          { key: 'agent', label: 'Agent', icon: Ghost },
          { key: 'overwatch', label: 'Overwatch', icon: Radar },
          { key: 'settings', label: 'Settings', icon: Settings },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`w-full py-3 px-1 text-[10px] tracking-wide uppercase transition-colors flex flex-col items-center gap-1.5 font-mono border-b-2 ${
              activeTab === key 
                ? 'text-nerv-orange border-nerv-orange bg-nerv-orange-faint' 
                : 'text-nerv-rust border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {/* WarRoom Opportunity Stream */}
      {activeTab === 'warroom' && (
        <div className="border-b border-nerv-brown p-4">
          <OpportunityStreamV2 />
        </div>
      )}

      {/* WarRoom Layer Toggles - Only show in warroom tab */}
      {activeTab === 'warroom' && financialLayers && dataLayers && onToggleFinancialLayer && onToggleDataLayer && (
        <div className="border-b border-nerv-brown p-4 space-y-4">
          {/* Financial Intel Toggles */}
          <div>
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-nerv-orange mb-2 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" />
              Financial Intel
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'polymarket', label: 'Polymarket' },
                { key: 'whales', label: 'Whales' },
                { key: 'yields', label: 'Yields' },
                { key: 'causation', label: 'Causation' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => onToggleFinancialLayer(key)}
                  className={`flex items-center justify-between px-2 py-1.5 border text-[10px] uppercase transition-all ${
                    financialLayers[key]
                      ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                      : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
                  }`}
                >
                  <span>{label}</span>
                  <div className={`w-1.5 h-1.5 ${financialLayers[key] ? 'bg-nerv-orange' : 'bg-nerv-brown'}`} />
                </button>
              ))}
            </div>
          </div>

          {/* Data Layers Toggles */}
          <div>
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-nerv-orange mb-2 flex items-center gap-2">
              <Database className="w-3 h-3" />
              Data Layers
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onToggleDataLayer('satellites')}
                className={`flex items-center justify-between px-2 py-1.5 border text-[10px] uppercase transition-all ${
                  dataLayers.satellites
                    ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                    : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
                }`}
              >
                <span>Satellites</span>
                <div className={`w-1.5 h-1.5 ${dataLayers.satellites ? 'bg-nerv-orange' : 'bg-nerv-brown'}`} />
              </button>
              <button
                onClick={() => onToggleDataLayer('earthquakes')}
                className={`flex items-center justify-between px-2 py-1.5 border text-[10px] uppercase transition-all ${
                  dataLayers.earthquakes
                    ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                    : 'bg-nerv-void-panel border-nerv-brown text-nerv-rust'
                }`}
              >
                <span>Earthquakes</span>
                <div className={`w-1.5 h-1.5 ${dataLayers.earthquakes ? 'bg-nerv-orange' : 'bg-nerv-brown'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'communications' && (
          <div className="space-y-4">
            <div className="nerv-panel border border-nerv-brown">
              <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-brown" style={{ padding: '12px 16px' }}>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-nerv-orange" />
                  <span className="nerv-panel-title text-nerv-orange" style={{ fontSize: '14px' }}>Active Objective</span>
                </div>
                <span className="nerv-label text-nerv-rust" style={{ fontSize: '13px' }}>SIGNALS: {objectiveResultCount}</span>
              </div>
              <div className="nerv-panel-content" style={{ padding: '16px' }}>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  onObjectiveSubmit();
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <input
                    value={objectiveQuery}
                    onChange={(e) => setObjectiveQuery(e.target.value)}
                    placeholder="Search signals..."
                    className="nerv-input flex-1 min-w-0 bg-nerv-void border border-nerv-brown text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange focus:outline-none"
                    style={{ fontSize: '14px', padding: '10px 12px' }}
                  />
                  <button
                    type="submit"
                    className="nerv-button shrink-0 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange hover:bg-nerv-orange/20"
                    style={{ fontSize: '13px', padding: '10px 16px' }}
                    disabled={objectiveLoading || !objectiveQuery.trim()}
                  >
                    {objectiveLoading ? '...' : 'EXEC'}
                  </button>
                </div>

                {objectiveError && <p className="nerv-body text-nerv-alert" style={{ fontSize: '13px' }}>{objectiveError}</p>}

                <p className="nerv-body" style={{ fontSize: '13px' }}>
                  Routes results to <span className="text-nerv-orange">WATCHTOWER</span> (middle panel).
                </p>
              </form>
              </div>
            </div>

            {/* Intelligent Market Search */}
            <div className="nerv-panel border border-nerv-brown">
              <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-brown" style={{ padding: '12px 16px' }}>
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-nerv-orange" />
                  <span className="nerv-panel-title text-nerv-orange" style={{ fontSize: '14px' }}>Intelligence Search</span>
                </div>
              </div>
              <div className="nerv-panel-content" style={{ padding: '16px' }}>
                {/* Wrap MarketSearch in a div with NERV styling */}
                <div className="intelligence-search-wrapper">
                  <IntelligentMarketSearch />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'protocols' && (
          <div className="space-y-3">
            {/* Enhanced Biotech Research Interface */}
            <div className="mb-4 p-3 border border-nerv-brown rounded bg-nerv-void">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setResearchMode('research')}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider border rounded transition-all ${
                    researchMode === 'research'
                      ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                      : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
                  }`}
                >
                  <Activity className="w-3 h-3 inline mr-1" />
                  Research
                </button>
                <button
                  onClick={() => setResearchMode('consult')}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-wider border rounded transition-all ${
                    researchMode === 'consult'
                      ? 'bg-nerv-orange-faint border-nerv-orange text-nerv-orange'
                      : 'border-nerv-brown text-nerv-rust hover:border-nerv-orange/50'
                  }`}
                >
                  <Brain className="w-3 h-3 inline mr-1" />
                  Consult
                </button>
              </div>

              {/* Research Mode */}
              {researchMode === 'research' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Beaker className="w-3 h-3 text-nerv-orange" />
                    <span className="text-[10px] uppercase tracking-wider text-nerv-orange">
                      Biotech Research
                    </span>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!researchQuery.trim()) return;
                      setResearchLoading(true);
                      const result = await researchBiotechQuery(researchQuery);
                      setResearchResult(result);
                      setResearchLoading(false);
                    }}
                    className="space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-nerv-rust" />
                        <input
                          type="text"
                          value={researchQuery}
                          onChange={(e) => setResearchQuery(e.target.value)}
                          placeholder="NMN longevity research, creatine dosage..."
                          className="w-full bg-nerv-void-panel border border-nerv-brown rounded pl-8 pr-2 py-1.5 text-xs text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange focus:outline-none transition-colors font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={researchLoading || !researchQuery.trim()}
                        className="px-2 py-1.5 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange rounded text-[10px] hover:bg-nerv-orange/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                      >
                        {researchLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Search'}
                      </button>
                    </div>
                    <p className="text-[10px] text-nerv-rust">
                      PubMed + evidence synthesis
                    </p>
                  </form>

                  {/* Research Results */}
                  {researchResult && (
                    <div className="mt-3 pt-3 border-t border-nerv-brown">
                      <ResearchResults result={researchResult} />
                    </div>
                  )}
                </>
              )}

              {/* Consult Mode - Wayne Protocol */}
              {researchMode === 'consult' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="w-3 h-3 text-nerv-orange" />
                    <span className="text-[10px] uppercase tracking-wider text-nerv-orange">
                      Wayne Protocol Consultant
                    </span>
                  </div>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!consultQuery.trim()) return;
                      setConsultLoading(true);
                      try {
                        const result = await consultWayneProtocol(consultQuery, parsedBiomarkers);
                        setConsultResult(result);
                      } catch (err) {
                        console.error('Consultation failed:', err);
                      } finally {
                        setConsultLoading(false);
                      }
                    }}
                    className="space-y-2"
                  >
                    <textarea
                      value={consultQuery}
                      onChange={(e) => {
                        setConsultQuery(e.target.value);
                        // Parse biomarkers as user types
                        const biomarkers = extractBiomarkers(e.target.value);
                        setParsedBiomarkers(biomarkers);
                      }}
                      placeholder="Slept 5h, HRV 48, feel sore... what's my protocol?"
                      rows={2}
                      className="w-full bg-nerv-void-panel border border-nerv-brown rounded px-2 py-1.5 text-xs text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange focus:outline-none transition-colors font-mono resize-none"
                    />
                    
                    {/* Parsed Biomarker Badges */}
                    {Object.keys(parsedBiomarkers).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {parsedBiomarkers.sleep && (
                          <span className="px-2 py-0.5 text-[10px] rounded border"
                            style={{ 
                              borderColor: parsedBiomarkers.sleep < 6 ? '#ef4444' : parsedBiomarkers.sleep < 7 ? '#eab308' : '#22c55e',
                              color: parsedBiomarkers.sleep < 6 ? '#ef4444' : parsedBiomarkers.sleep < 7 ? '#eab308' : '#22c55e',
                              backgroundColor: 'rgba(0,0,0,0.3)'
                            }}>
                            Sleep: {parsedBiomarkers.sleep}h
                          </span>
                        )}
                        {parsedBiomarkers.hrv && (
                          <span className="px-2 py-0.5 text-[10px] rounded border"
                            style={{ 
                              borderColor: parsedBiomarkers.hrv < 50 ? '#ef4444' : parsedBiomarkers.hrv < 60 ? '#eab308' : '#22c55e',
                              color: parsedBiomarkers.hrv < 50 ? '#ef4444' : parsedBiomarkers.hrv < 60 ? '#eab308' : '#22c55e',
                              backgroundColor: 'rgba(0,0,0,0.3)'
                            }}>
                            HRV: {parsedBiomarkers.hrv}
                          </span>
                        )}
                        {parsedBiomarkers.readiness && (
                          <span className="px-2 py-0.5 text-[10px] rounded border"
                            style={{ 
                              borderColor: parsedBiomarkers.readiness < 5 ? '#ef4444' : parsedBiomarkers.readiness < 7 ? '#eab308' : '#22c55e',
                              color: parsedBiomarkers.readiness < 5 ? '#ef4444' : parsedBiomarkers.readiness < 7 ? '#eab308' : '#22c55e',
                              backgroundColor: 'rgba(0,0,0,0.3)'
                            }}>
                            Readiness: {parsedBiomarkers.readiness}/10
                          </span>
                        )}
                        {parsedBiomarkers.subjective && (
                          <span className="px-2 py-0.5 text-[10px] rounded border border-nerv-orange text-nerv-orange bg-black/30">
                            State: {parsedBiomarkers.subjective}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={consultLoading || !consultQuery.trim()}
                        className="flex-1 px-2 py-1.5 bg-nerv-orange-faint border border-nerv-orange text-nerv-orange rounded text-[10px] hover:bg-nerv-orange/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors uppercase"
                      >
                        {consultLoading ? <RefreshCw className="w-3 h-3 animate-spin inline mr-1" /> : null}
                        Get Protocol
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-nerv-rust">
                      Enter biomarkers + question for personalized protocol
                    </p>
                  </form>

                  {/* Quick Templates */}
                  <div className="mt-3 pt-2 border-t border-nerv-brown">
                    <p className="text-[10px] text-nerv-rust mb-2">Quick questions:</p>
                    <div className="flex flex-wrap gap-1">
                      {PROTOCOL_TEMPLATES.slice(0, 4).map((template) => (
                        <button
                          key={template.label}
                          onClick={() => setConsultQuery(template.query)}
                          className="px-2 py-0.5 text-[10px] border border-nerv-brown text-nerv-rust hover:border-nerv-orange hover:text-nerv-orange rounded transition-colors"
                        >
                          {template.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Consult Result */}
                  {consultResult && (
                    <div className="mt-3 pt-3 border-t border-nerv-brown">
                      <div className="p-3 bg-nerv-void-panel rounded border border-nerv-brown">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-3 h-3 text-nerv-orange" />
                          <span className="text-[10px] uppercase tracking-wider text-nerv-orange">
                            Protocol Response
                          </span>
                        </div>
                        <div className="text-[11px] text-nerv-amber whitespace-pre-wrap leading-relaxed">
                          {consultResult.response}
                        </div>
                        <p className="mt-2 text-[9px] text-nerv-rust">
                          Generated: {new Date(consultResult.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Daily Protocols Header - Moved down */}
            <div className="flex items-center justify-between pt-2 border-t border-nerv-brown" style={{ padding: '12px 4px 0' }}>
              <span className="nerv-section-header text-nerv-orange" style={{ fontSize: '14px' }}>Daily Protocols</span>
              <span className="nerv-data text-nerv-amber" style={{ fontSize: '16px' }}>
                {completedCount}/{protocols.length}
              </span>
            </div>

            {protocols.map((protocol) => (
              <div
                key={protocol.id}
                className={`nerv-panel cursor-pointer transition-all hover:border-nerv-orange border border-nerv-brown ${
                  protocol.status === 'completed' ? 'border-nerv-orange' : ''
                }`}
                onClick={() => handleProtocolClick(protocol)}
              >
                <div className="flex items-start gap-4 p-4">
                  <div
                    className={`w-5 h-5 flex items-center justify-center mt-0.5 cursor-pointer border ${
                      protocol.status === 'completed' 
                        ? 'border-nerv-orange bg-nerv-orange-faint' 
                        : 'border-nerv-brown'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleProtocol(protocol.id);
                    }}
                  >
                    {protocol.status === 'completed' && (
                      <svg className="w-4 h-4 text-nerv-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="nerv-body" style={{ 
                        color: protocol.status === 'completed' ? 'var(--nerv-orange)' : 'var(--nerv-amber)',
                        fontSize: '14px'
                      }}>{protocol.title}</span>
                      <span className="nerv-timestamp text-nerv-rust" style={{ fontSize: '12px' }}>{protocol.time}</span>
                    </div>
                    <p className="nerv-body text-nerv-rust" style={{ fontSize: '13px' }}>{protocol.description}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="nerv-panel mt-4 border border-nerv-brown">
              <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-brown" style={{ padding: '12px 16px' }}>
                <Clock className="w-4 h-4 text-nerv-orange" />
                <span className="nerv-panel-title text-nerv-orange" style={{ fontSize: '14px' }}>Progress</span>
              </div>
              <div className="nerv-panel-content" style={{ padding: '16px' }}>
                <div className="h-2 bg-nerv-void border border-nerv-brown">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ 
                      width: `${progress}%`,
                      boxShadow: '0 0 10px var(--nerv-orange-glow)'
                    }}
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'intel' && (
          <div className="space-y-4">
            <NewsBroadcast />
            <GitHubReleasesFeed />
          </div>
        )}

        {activeTab === 'overwatch' && (
          <div className="space-y-4">
            <div className="nerv-panel border border-nerv-brown">
              <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-brown" style={{ padding: '12px 16px' }}>
                <Radar className="w-4 h-4 text-nerv-orange" />
                <span className="nerv-panel-title text-nerv-orange" style={{ fontSize: '14px' }}>Overwatch</span>
              </div>
              <div className="nerv-panel-content" style={{ padding: '16px' }}>
                <p className="nerv-body" style={{ fontSize: '14px' }}>Live system monitoring in the main panel.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="nerv-panel border border-nerv-brown">
              <div className="nerv-panel-header bg-nerv-void-panel border-b border-nerv-brown" style={{ padding: '12px 16px' }}>
                <Lock className="w-4 h-4 text-nerv-orange" />
                <span className="nerv-panel-title text-nerv-orange" style={{ fontSize: '14px' }}>Access Control</span>
              </div>
              <div className="nerv-panel-content" style={{ padding: '16px' }}>
                <p className="nerv-body" style={{ fontSize: '14px' }}>Adjust system settings in the main panel.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agent' && (
          <div className="space-y-4">
            <DeFiSearchModule />
            <PolymarketOracleCard enabled={true} layout="stacked" onSignalClick={() => {}} />
            <OnChainWhaleWatcher enabled={true} layout="stacked" />
            <DeFiYieldRadar enabled={true} layout="stacked" />
          </div>
        )}
      </div>

      {/* Market Detail Modal - Rendered outside tab content */}
      {selectedMarket && (
        <MarketDetail
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
        />
      )}
    </div>
  );
}
