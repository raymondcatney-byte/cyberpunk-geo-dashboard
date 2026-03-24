import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Database, ExternalLink } from 'lucide-react';
import { KNOWLEDGE_BASE } from '../config/knowledgeBase';

import { extractBiomarkers, formatBiomarkersForPrompt } from '../lib/protocol/biomarker-parser';

import { matchKnowledgeEvidence, toBiomarkerEnrichedQuery, type ProtocolResearchSignal } from '../lib/knowledge-evidence';

type FeedSignal = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  tags?: string[];
};

type ConsultantState = {
  response: string | null;
  loading: boolean;
  error: string | null;
};

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function deriveBiomarkerAdjustments(signals: string[]) {
  const joined = signals.join(' ').toLowerCase();
  const adjustments: string[] = [];

  if (/<6h|sleep: 5|sleep: 4/.test(joined)) {
    adjustments.push('Recovery bias: delay fasting, drop training intensity, and front-load hydration/electrolytes.');
  }
  if (/hrv: [0-4]\d|hrv: 5[0-2]/.test(joined)) {
    adjustments.push('Low-HRV adjustment: skip sauna strain, prioritize mobility, and add extra glycine/magnesium support.');
  }
  if (/sore|inflamed|fatigue|fatigued/.test(joined)) {
    adjustments.push('Inflammation flag: bias toward recovery protocols, remove aggressive performance pushes, and reduce eccentric load.');
  }
  if (/readiness: [0-4]\b/.test(joined)) {
    adjustments.push('Low-readiness day: swap deep output for maintenance work and compress stimulus to the minimum effective dose.');
  }

  return adjustments;
}

function matchDailyProtocols(query: string) {
  const queryTokens = new Set(tokenize(query));
  return DEFAULT_PROTOCOLS
    .map((protocol) => {
      const haystack = `${protocol.title} ${protocol.description} ${protocol.details.rationale} ${protocol.details.methodology}`;
      const tokens = new Set(tokenize(haystack));
      let overlap = 0;
      for (const token of queryTokens) {
        if (tokens.has(token)) overlap += 1;
      }
      return { protocol, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map((item) => item.protocol);
}

export function ProtocolKnowledgeWorkbench({
  protocol,
  query,
}: {
  protocol?: { title: string; description?: string } | null;
  query: string;
}) {
  const [feedSignals, setFeedSignals] = useState<FeedSignal[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [consultant, setConsultant] = useState<ConsultantState>({ response: null, loading: false, error: null });
  const { search, articles, totalResults, loading: pubmedLoading, error: pubmedError } = usePubMedResearch();

  const effectiveQuery = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed) return trimmed;
    if (protocol?.title) return protocol.title;
    return 'longevity sleep recovery biomarkers';
  }, [protocol, query]);

  const biomarkers = useMemo(() => extractBiomarkers(effectiveQuery), [effectiveQuery]);
  const biomarkerSignals = useMemo(() => {
    const formatted = formatBiomarkersForPrompt(biomarkers);
    return formatted ? formatted.split(',').map((part) => part.trim()).filter(Boolean) : [];
  }, [biomarkers]);
  const enrichedQuery = useMemo(
    () => toBiomarkerEnrichedQuery(effectiveQuery, biomarkerSignals),
    [effectiveQuery, biomarkerSignals]
  );

  const biomarkerAdjustments = useMemo(() => deriveBiomarkerAdjustments(biomarkerSignals), [biomarkerSignals]);

  const localEvidence = useMemo(
    () => matchKnowledgeEvidence(KNOWLEDGE_BASE, enrichedQuery.rawQuery),
    [enrichedQuery.rawQuery]
  );

  const matchingProtocols = useMemo(
    () => matchDailyProtocols(`${protocol?.title || ''} ${enrichedQuery.rawQuery}`.trim()),
    [enrichedQuery.rawQuery, protocol?.title]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSignals() {
      setFeedLoading(true);
      setFeedError(null);
      try {
        const response = await fetch('/api/watchtower/items?limit=40', {
          headers: { Accept: 'application/json' },
        });
        const payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || 'UPSTREAM');
        const results = Array.isArray(payload.results) ? payload.results : [];
        const filtered = results
          .filter((item: any) =>
            Array.isArray(item.tags) &&
            item.tags.some((tag: string) => ['biotech', 'health', 'fda', 'nih', 'pharma'].includes(String(tag).toLowerCase()))
          )
          .slice(0, 8);
        if (!cancelled) setFeedSignals(filtered);
      } catch (error) {
        if (!cancelled) {
          setFeedSignals([]);
          setFeedError(error instanceof Error ? error.message : 'WATCHTOWER_FAILED');
        }
      } finally {
        if (!cancelled) setFeedLoading(false);
      }
    }

    void loadSignals();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void search(
      protocol?.title
        ? `${protocol.title} ${effectiveQuery}`.trim()
        : effectiveQuery
    );
  }, [effectiveQuery, protocol?.title, search]);

  useEffect(() => {
    let cancelled = false;

    async function loadConsultant() {
      setConsultant({ response: null, loading: true, error: null });
      try {
        const response = await fetch('/api/protocol-consultant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            query: protocol?.title ? `${protocol.title}: ${effectiveQuery}` : effectiveQuery,
            biomarkers,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'CONSULTANT_FAILED');
        if (!cancelled) {
          setConsultant({
            response: typeof payload.response === 'string' ? payload.response : null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setConsultant({
            response: null,
            loading: false,
            error: error instanceof Error ? error.message : 'CONSULTANT_FAILED',
          });
        }
      }
    }

    void loadConsultant();
    return () => {
      cancelled = true;
    };
  }, [biomarkers, effectiveQuery, protocol?.title]);

  const officialSignals: ProtocolResearchSignal[] = useMemo(
    () =>
      feedSignals.map((signal) => ({
        id: signal.id,
        title: signal.title,
        summary: signal.source,
        source: 'official_feed',
        confidence: 'high',
        tags: signal.tags || [],
        url: signal.url,
        publishedAt: signal.publishedAt,
      })),
    [feedSignals]
  );

  const researchSignals: ProtocolResearchSignal[] = useMemo(
    () =>
      articles.slice(0, 5).map((article) => ({
        id: article.pmid,
        title: article.title,
        summary: `${article.journal} • ${article.pubDate}`,
        source: 'research_evidence',
        confidence: 'medium',
        tags: ['pubmed', ...(protocol?.title ? [protocol.title.toLowerCase()] : [])],
        url: article.url,
        publishedAt: article.pubDate,
      })),
    [articles, protocol?.title]
  );

  return (
    <div className="flex h-full flex-col border-l border-nerv-brown bg-nerv-void">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <KnowledgeSection
          icon={<Database className="h-4 w-4 text-nerv-orange" />}
          title="Curated Protocol Theses"
          items={localEvidence}
          empty="No local biotech or health thesis matched this query."
        />

        <div className="border border-nerv-orange/30 bg-nerv-void-panel p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-nerv-orange" />
            <h4 className="text-[12px] font-medium text-nerv-orange">Biomarker Trigger Board</h4>
          </div>
          {biomarkerAdjustments.length ? (
            <div className="space-y-2">
              {biomarkerAdjustments.map((adjustment) => (
                <div key={adjustment} className="border border-nerv-amber/20 bg-nerv-void p-3 text-[11px] text-nerv-amber">
                  {adjustment}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-nerv-rust">No strong biomarker-derived overrides detected from the current query.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function KnowledgeSection({
  icon,
  title,
  items,
  empty,
}: {
  icon: ReactNode;
  title: string;
  items: ProtocolResearchSignal[];
  empty: string;
}) {
  return (
    <div className="border border-nerv-orange/30 bg-nerv-void-panel p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h4 className="text-[12px] font-medium text-nerv-orange">{title}</h4>
      </div>
      {items.length ? (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border border-nerv-brown bg-nerv-void p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-nerv-amber">{item.title}</div>
                <ConfidenceBadge confidence={item.confidence} />
              </div>
              <div className="mt-1 text-[11px] text-nerv-rust">{item.summary}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {item.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="text-[9px] text-nerv-rust">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-nerv-rust">{empty}</div>
      )}
    </div>
  );
}

function ResearchCard({ signal }: { signal: ProtocolResearchSignal }) {
  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-nerv-brown bg-nerv-void p-3 transition-colors hover:border-nerv-orange/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] text-nerv-amber">{signal.title}</div>
          <div className="mt-1 text-[10px] text-nerv-rust">{signal.summary}</div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-nerv-rust" />
      </div>
    </a>
  );
}

function ConfidenceBadge({ confidence }: { confidence: ProtocolResearchSignal['confidence'] }) {
  const tone =
    confidence === 'high' ? 'border-nerv-amber/30 bg-nerv-amber-faint text-nerv-amber' :
    confidence === 'medium' ? 'border-nerv-orange/30 bg-nerv-orange/10 text-nerv-orange' :
    'border-nerv-brown bg-nerv-void-warm text-nerv-rust';

  return (
    <span className={`border px-2 py-1 text-[9px] uppercase tracking-wider ${tone}`}>
      {confidence}
    </span>
  );
}
