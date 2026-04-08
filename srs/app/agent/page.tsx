'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Brain,
  Compass,
  RefreshCw,
  ShieldAlert,
  Signal,
  TrendingUp,
  Users,
  Zap,
  Globe,
  Newspaper,
  Activity,
} from 'lucide-react';
import { SwarmPanel } from '../../components/SwarmPanel';
import { PMAnalystChat } from '../../components/agent/PMAnalystChat';
import { MarketDataCard } from '../../components/MarketDataCard';
import { CommoditiesCard } from '../../components/CommoditiesCard';
import { useSynthesis } from '../../hooks/useSynthesis';
import { PMFlowPanel } from '../../components/agent/PMFlowPanel';
import { MagiDots } from '../../components/effects/MagiDots';
import { useWorldBrief, useLiveFeed, useHotspots } from '../../hooks/useWorldMonitor';
import { useYieldRadar, useLargeTrades } from '../../hooks/useDeFiData';
import type { SynthesisDomain, SynthesisOpportunity } from '../../lib/synthesis-engine';

export default function AgentPage() {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
    const savedKey = typeof window !== 'undefined' ? localStorage.getItem('ai_api_key_raw') : null;
    const savedProvider = typeof window !== 'undefined' ? localStorage.getItem('ai_provider') : null;
    if (envKey || (savedKey && (savedProvider === 'grok' || savedKey.startsWith('gsk_')))) {
      setHasApiKey(true);
    }
  }, []);

  // Core synthesis data
  const { snapshot, synthesis, loading, error, refresh } = useSynthesis(true, 60_000);
  
  // Real data hooks
  const { brief: worldBrief, loading: worldLoading } = useWorldBrief(true);
  const { items: newsItems, loading: newsLoading, error: newsError, source: newsSource, lastUpdated: newsLastUpdated } = useLiveFeed(true, 20);
  const { hotspots, loading: hotspotsLoading, error: hotspotsError, source: hotspotsSource, lastUpdated: hotspotsLastUpdated } = useHotspots(true);
  const { yields: yieldData, loading: yieldsLoading, error: yieldsError, lastUpdated: yieldsLastUpdated } = useYieldRadar(true);
  const { trades: whaleTrades, loading: whalesLoading, error: whalesError, lastUpdated: whalesLastUpdated } = useLargeTrades(true);

  // Calculate live source count from real data
  const liveSources = useMemo(() => {
    let count = 0;
    if (snapshot?.polymarket.length) count++;
    if (yieldData.length) count++;
    if (whaleTrades.length) count++;
    if (newsItems.length) count++;
    if (hotspots.length) count++;
    return count;
  }, [snapshot, yieldData, whaleTrades, newsItems, hotspots]);

  const [quoteStatuses, setQuoteStatuses] = useState<Record<string, { state: 'live' | 'degraded'; lastSuccess: string | null }>>({});

  const handleQuoteStatus = useCallback((update: { id: string; state: 'live' | 'degraded'; lastSuccess: string | null }) => {
    setQuoteStatuses((prev) => ({ ...prev, [update.id]: { state: update.state, lastSuccess: update.lastSuccess } }));
  }, []);

  const quotesAggregated = useMemo<{ state: 'live' | 'degraded'; lastSuccess: string | null }>(() => {
    const entries = Object.values(quoteStatuses);
    if (!entries.length) return { state: 'degraded' as const, lastSuccess: null };
    const anyDegraded = entries.some((e) => e.state === 'degraded');
    const last = entries
      .map((e) => e.lastSuccess)
      .filter(Boolean)
      .map((t) => new Date(String(t)).getTime())
      .filter((t) => Number.isFinite(t));
    const lastSuccess = last.length ? new Date(Math.max(...last)).toLocaleTimeString() : null;
    return { state: anyDegraded ? 'degraded' : 'live', lastSuccess };
  }, [quoteStatuses]);

  const newsStatus = useMemo(() => {
    if (newsLoading) return { state: 'degraded' as const, lastSuccess: newsLastUpdated || null };
    if (newsError || newsSource === 'fallback' || newsItems.length === 0) {
      return { state: 'degraded' as const, lastSuccess: newsLastUpdated || null };
    }
    return { state: 'live' as const, lastSuccess: newsLastUpdated || null };
  }, [newsLoading, newsError, newsSource, newsItems.length, newsLastUpdated]);

  const hotspotsStatus = useMemo(() => {
    if (hotspotsLoading) return { state: 'degraded' as const, lastSuccess: hotspotsLastUpdated || null };
    if (hotspotsError || hotspotsSource === 'fallback' || hotspots.length === 0) {
      return { state: 'degraded' as const, lastSuccess: hotspotsLastUpdated || null };
    }
    return { state: 'live' as const, lastSuccess: hotspotsLastUpdated || null };
  }, [hotspotsLoading, hotspotsError, hotspotsSource, hotspots.length, hotspotsLastUpdated]);

  const yieldsStatus = useMemo(() => {
    if (yieldsLoading) return { state: 'degraded' as const, lastSuccess: yieldsLastUpdated || null };
    if (yieldsError || yieldData.length === 0) return { state: 'degraded' as const, lastSuccess: yieldsLastUpdated || null };
    return { state: 'live' as const, lastSuccess: yieldsLastUpdated || null };
  }, [yieldsLoading, yieldsError, yieldsLastUpdated, yieldData.length]);

  const whalesStatus = useMemo(() => {
    if (whalesLoading) return { state: 'degraded' as const, lastSuccess: whalesLastUpdated || null };
    if (whalesError || whaleTrades.length === 0) return { state: 'degraded' as const, lastSuccess: whalesLastUpdated || null };
    return { state: 'live' as const, lastSuccess: whalesLastUpdated || null };
  }, [whalesLoading, whalesError, whalesLastUpdated, whaleTrades.length]);

  const sharedData = useMemo(
    () => ({
      polymarket: snapshot?.polymarket || [],
      yields: yieldData || [],
      whales: whaleTrades || [],
      synthesis,
    }),
    [snapshot, yieldData, whaleTrades, synthesis]
  );

  const topPredictionEdges = useMemo(
    () => synthesis.opportunities.filter((item) => item.domain === 'prediction_market').slice(0, 4),
    [synthesis]
  );
  const topYieldDislocations = useMemo(
    () => synthesis.opportunities.filter((item) => item.domain === 'defi').slice(0, 4),
    [synthesis]
  );
  const topEnergySignals = useMemo(
    () => synthesis.alerts.filter((item) => item.domain === 'energy').slice(0, 4),
    [synthesis]
  );
  
  // Real geopolitical signals from world monitor
  const geoSignals = useMemo(() => {
    return hotspots.slice(0, 4).map(h => ({
      id: h.id,
      title: h.name,
      summary: `${h.events24h} events in 24h, trend: ${h.trend}`,
      region: h.country,
      source: 'watchtower' as const,
      confidence: h.severity === 'critical' ? 'high' : h.severity === 'high' ? 'high' : 'medium' as const,
      tags: [h.category, h.trend],
    }));
  }, [hotspots]);
  
  // Real news feed for biotech signals
  const newsSignals = useMemo(() => {
    return newsItems.slice(0, 4).map(item => ({
      id: item.id,
      title: item.title,
      summary: `${item.source} | ${item.category}`,
      source: 'official_feed' as const,
      confidence: item.severity === 'critical' ? 'high' : 'medium' as const,
      tags: [item.category, item.country || 'global'],
      url: item.url,
    }));
  }, [newsItems]);

  const formatLast = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '--:--');
  const newsEmpty = newsLoading
    ? 'Loading news feed...'
    : newsStatus.state === 'degraded'
      ? `DEGRADED | LAST ${formatLast(newsLastUpdated || null)}`
      : 'No recent intelligence updates.';
  const hotspotsEmpty = hotspotsLoading
    ? 'Loading hotspot data...'
    : hotspotsStatus.state === 'degraded'
      ? `DEGRADED | LAST ${formatLast(hotspotsLastUpdated || null)}`
      : 'No active hotspots detected.';

  return (
    <div className="h-full bg-[var(--void)] text-[var(--steel)]">
      <div className="flex h-full flex-col">
        <header className="border-b border-[var(--steel-faint)] bg-[var(--void-panel)]">
          <div className="px-4 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center border border-[var(--nerv-orange-dim)] bg-[var(--nerv-orange-faint)] nerv-angular-tl">
                  <Brain className="h-5 w-5 text-[var(--nerv-orange)]" />
                </div>
                <div>
                  <h1 className="nerv-title text-base">Ghost Trading Console</h1>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--steel-dim)]">
                    cross-domain synthesis | bruce decision support | paper execution log
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:flex xl:items-center">
                <StatusChip
                  label="AI Backend"
                  value={hasApiKey ? 'LIVE' : 'FALLBACK'}
                  tone={hasApiKey ? 'green' : 'amber'}
                />
                <StatusChip
                  label="Data Feeds"
                  value={`${liveSources}/5 LIVE`}
                  tone={liveSources > 0 ? 'orange' : 'amber'}
                />
                <MagiDots showLabel />
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="nerv-button flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                <PanelStatus label="NEWS" status={newsStatus.state} lastSuccess={newsStatus.lastSuccess} />
                <PanelStatus label="HOTSPOTS" status={hotspotsStatus.state} lastSuccess={hotspotsStatus.lastSuccess} />
                <PanelStatus label="YIELDS" status={yieldsStatus.state} lastSuccess={yieldsStatus.lastSuccess} />
                <PanelStatus label="WHALES" status={whalesStatus.state} lastSuccess={whalesStatus.lastSuccess} />
                <PanelStatus label="QUOTES" status={quotesAggregated.state} lastSuccess={quotesAggregated.lastSuccess} />
              </div>
            </div>
          </div>
        </header>

        {!hasApiKey && (
          <div className="border-b border-[var(--steel-faint)] bg-[var(--nerv-orange-faint)] p-4">
            <div className="flex items-center gap-2 text-[12px] text-[var(--nerv-orange)]">
              <AlertTriangle className="h-4 w-4" />
              <span>Groq key not configured. Bruce-side synthesis will run in fallback mode until a key is saved in Settings.</span>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[200px_340px_minmax(0,1fr)_320px]">
            {/* Financial Data - Far Left Column */}
            <section className="space-y-4">
              <MarketDataCard 
                title="Crypto" 
                symbols={['BTCUSD', 'ETHUSD']} 
                icon="crypto"
                onStatusChange={handleQuoteStatus}
              />
              <MarketDataCard 
                title="Stocks" 
                symbols={['SPY', 'QQQ', 'NVDA', 'AAPL', 'TSLA']} 
                icon="stocks"
                allowSearch
                onStatusChange={handleQuoteStatus}
              />
              <CommoditiesCard />
            </section>
            
            <section className="h-full min-h-[500px]">
              <PMAnalystChat />
            </section>

            <section className="space-y-4">
              <SignalPanel
                icon={<Zap className="h-4 w-4 text-[var(--data-green)]" />}
                title="Energy Catalyst Tape"
                label="GRID INTEL"
                empty={snapshot ? 'Grid signals are currently degraded or awaiting upstream data.' : 'Loading grid catalysts...'}
                items={topEnergySignals.map((signal) => ({
                  id: signal.id,
                  title: signal.title,
                  subtitle: signal.region || signal.domain,
                  body: signal.summary,
                  tone: signal.severity === 'high' ? 'orange' : 'green',
                }))}
              />

              <SignalPanel
                icon={<Newspaper className="h-4 w-4 text-[var(--nerv-orange)]" />}
                title="Intelligence Feed"
                label="LIVE NEWS"
                empty={newsEmpty}
                items={newsSignals.map((signal) => ({
                  id: signal.id,
                  title: signal.title,
                  subtitle: signal.tags.join(' | '),
                  body: signal.summary,
                  tone: signal.confidence === 'high' ? 'green' : 'orange',
                  href: signal.url,
                }))}
              />

              <SignalPanel
                icon={<Globe className="h-4 w-4 text-[var(--nerv-orange)]" />}
                title="Geopolitical Hotspots"
                label="LIVE MONITOR"
                empty={hotspotsEmpty}
                items={geoSignals.map((signal) => ({
                  id: signal.id,
                  title: signal.title,
                  subtitle: signal.region || 'Global',
                  body: signal.summary,
                  tone: signal.confidence === 'high' ? 'orange' : 'green',
                }))}
              />

              <div className="nerv-panel nerv-panel-angular nerv-corner-accent relative nerv-hex-pattern nerv-panel-hover">
                <div className="corner-bl"></div>
                <div className="corner-br"></div>
                <div className="nerv-panel-header">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[var(--data-green)]" />
                    <span className="nerv-panel-title-serif">Paper Ideas</span>
                  </div>
                  <span className="nerv-label">TRACK ONLY</span>
                </div>
                <div className="nerv-panel-content space-y-2">
                  {synthesis.paperTrades.map((idea) => (
                    <div key={idea.id} className="nerv-angular-tl border border-[var(--steel-faint)] bg-[var(--void-panel)] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="line-clamp-2 text-[11px] text-[var(--steel)]">{idea.title}</div>
                        <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--nerv-orange)]">{idea.action}</div>
                      </div>
                      <div className="mt-1 text-[10px] text-[var(--steel-dim)]">{idea.rationale}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Column 4: PM Flow Alerts - Far Right */}
            <section className="h-full min-h-[500px]">
              <PMFlowPanel />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'orange' }) {
  const toneClass =
    tone === 'green'
      ? 'border-[var(--data-green-dim)] bg-[var(--data-green-faint)] text-[var(--data-green)]'
      : tone === 'amber'
        ? 'border-[var(--nerv-orange-dim)] bg-[var(--nerv-orange-faint)] text-[var(--nerv-orange)]'
        : 'border-[var(--nerv-orange-dim)] bg-[var(--nerv-orange-faint)] text-[var(--nerv-orange)]';

  return (
    <div className={`border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-1 font-mono text-[12px]">{value}</div>
    </div>
  );
}

function MetricCell({ label, value, tone }: { label: string; value: string; tone: 'orange' | 'green' }) {
  const toneClass =
    tone === 'orange' ? 'text-[var(--nerv-orange)]' :
    'text-[var(--data-green)]';

  return (
    <div className="border border-[var(--steel-faint)] bg-[var(--void-panel)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--steel-dim)]">{label}</div>
      <div className={`mt-1 font-mono text-[18px] ${toneClass}`}>{value}</div>
    </div>
  );
}

function OpportunityCard({ opportunity }: { opportunity: SynthesisOpportunity }) {
  const tone = toneForDomain(opportunity.domain);
  return (
    <div className="nerv-angular-tl border border-[var(--steel-faint)] bg-[var(--void-panel)] p-3 hover:border-nerv-orange/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-[11px] text-[var(--steel)]">{opportunity.title}</div>
          <div className={`mt-1 text-[10px] uppercase tracking-[0.12em] ${tone}`}>{opportunity.domain.replace('_', ' ')}</div>
        </div>
        <div className={opportunity.edge >= 0 ? 'font-mono text-[12px] text-[var(--data-green)]' : 'font-mono text-[12px] text-[var(--alert-red)]'}>
          {opportunity.edge >= 0 ? '+' : ''}
          {(opportunity.edge * 100).toFixed(1)}%
        </div>
      </div>
      <div className="mt-2 text-[10px] text-[var(--nerv-orange)]">{opportunity.summary}</div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--steel-dim)]">
        <span>{opportunity.venue || opportunity.horizon}</span>
        <span>{opportunity.confidence}% conf</span>
      </div>
      {opportunity.catalysts.length > 0 && (
        <div className="mt-2 text-[10px] text-[var(--steel-dim)]">{opportunity.catalysts.slice(0, 2).join(' | ')}</div>
      )}
    </div>
  );
}

function SignalPanel({
  icon,
  title,
  label,
  items,
  empty,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  items: Array<{ id: string; title: string; subtitle: string; body: string; tone: 'green' | 'orange'; href?: string }>;
  empty: string;
}) {
  return (
    <div className="nerv-panel nerv-panel-angular nerv-corner-accent relative nerv-hex-pattern nerv-panel-hover">
      <div className="corner-bl"></div>
      <div className="corner-br"></div>
      <div className="nerv-panel-header">
        <div className="flex items-center gap-2">
          {icon}
          <span className="nerv-panel-title-serif">{title}</span>
        </div>
        <span className="nerv-label">{label}</span>
      </div>
      <div className="nerv-panel-content space-y-2">
        {items.length ? (
          items.slice(0, 4).map((item) => {
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-mono text-[11px] text-[var(--steel)]">{item.title}</div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-[var(--steel-dim)]">{item.subtitle}</div>
                  </div>
                </div>
                <div className={`mt-2 text-[10px] ${item.tone === 'orange' ? 'text-[var(--nerv-orange)]' : 'text-[var(--data-green)]'}`}>
                  {item.body}
                </div>
              </>
            );
            return item.href ? (
              <a
                key={item.id}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block border border-[var(--steel-faint)] bg-[var(--void-panel)] px-3 py-2 transition-colors hover:border-[var(--wire-cyan-dim)]"
              >
                {body}
              </a>
            ) : (
              <div key={item.id} className="border border-[var(--steel-faint)] bg-[var(--void-panel)] px-3 py-2">
                {body}
              </div>
            );
          })
        ) : (
          <div className="text-[12px] text-[var(--steel-dim)]">{empty}</div>
        )}
      </div>
    </div>
  );
}

function DataFeedRow({ label, status, detail }: { label: string; status: string; detail?: string }) {
  return (
    <div className="flex items-center justify-between border border-[var(--steel-faint)] bg-[var(--void-panel)] px-3 py-2 text-[11px]">
      <div className="min-w-0">
        <div className="uppercase tracking-[0.14em] text-[var(--steel-dim)]">{label}</div>
        {detail && <div className="mt-1 text-[10px] text-[var(--steel-dim)]">{detail}</div>}
      </div>
      <span className={status === 'live' ? 'text-[var(--data-green)]' : 'text-[var(--nerv-orange)]'}>
        {status.toUpperCase()}
      </span>
    </div>
  );
}

function toneForDomain(domain: SynthesisDomain) {
  switch (domain) {
    case 'prediction_market':
      return 'text-[var(--nerv-orange)]';
    case 'defi':
      return 'text-[var(--data-green)]';
    case 'energy':
      return 'text-[var(--wire-cyan)]';
    case 'biotech':
      return 'text-[var(--data-green)]';
    case 'geopolitics':
      return 'text-[var(--wire-cyan)]';
    default:
      return 'text-[var(--steel-dim)]';
  }
}

function PanelStatus({ label, status, lastSuccess }: { label: string; status: 'live' | 'degraded'; lastSuccess: string | null }) {
  const toneClass =
    status === 'live'
      ? 'border-[var(--data-green-dim)] bg-[var(--data-green-faint)] text-[var(--data-green)]'
      : 'border-[var(--nerv-orange-dim)] bg-[var(--nerv-orange-faint)] text-[var(--nerv-orange)]';

  return (
    <div className={`border px-2 py-1 ${toneClass}`}>
      <div className="text-[9px] uppercase tracking-[0.14em]">{label}</div>
      <div className="mt-0.5 text-[9px]">{status.toUpperCase()} {lastSuccess ? `| ${lastSuccess}` : ''}</div>
    </div>
  );
}
