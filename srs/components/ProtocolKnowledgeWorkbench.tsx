import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Activity, Database, ExternalLink, Loader2, Microscope, Radar, ShieldPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { KNOWLEDGE_BASE } from '../config/knowledgeBase';
import { extractBiomarkers, formatBiomarkersForPrompt } from '../lib/protocol/biomarker-parser';
import { matchKnowledgeEvidence, toBiomarkerEnrichedQuery, type ProtocolResearchSignal } from '../lib/knowledge-evidence';
import { useProtocolData } from '../hooks/useProtocolData';

interface FeedSignal {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
  tags?: string[];
}

type SectionState = {
  theses: boolean;
  biomarkers: boolean;
  watchtower: boolean;
  pubmed: boolean;
  consultant: boolean;
};

const DEFAULT_SECTIONS: SectionState = {
  theses: true,
  biomarkers: true,
  watchtower: true,
  pubmed: true,
  consultant: true,
};

function loadSectionPrefs(): SectionState {
  if (typeof window === 'undefined') return DEFAULT_SECTIONS;
  try {
    const stored = localStorage.getItem('protocol_workbench_sections');
    return stored ? { ...DEFAULT_SECTIONS, ...JSON.parse(stored) } : DEFAULT_SECTIONS;
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function saveSectionPrefs(prefs: SectionState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('protocol_workbench_sections', JSON.stringify(prefs));
  } catch {}
}

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

export function ProtocolKnowledgeWorkbench({
  protocol,
  query,
}: {
  protocol?: { title: string; description?: string } | null;
  query: string;
}) {
  const [sections, setSections] = useState<SectionState>(loadSectionPrefs);
  const { watchtower, pubmed, consultant, fetchAll, cancelPending } = useProtocolData();

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

  // Fetch data when query changes
  useEffect(() => {
    fetchAll(enrichedQuery.rawQuery, protocol?.title);
    return () => cancelPending();
  }, [enrichedQuery.rawQuery, protocol?.title, fetchAll, cancelPending]);

  // Save section preferences
  useEffect(() => {
    saveSectionPrefs(sections);
  }, [sections]);

  const toggleSection = (key: keyof SectionState) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const officialSignals: ProtocolResearchSignal[] = useMemo(
    () =>
      watchtower.results.map((signal: FeedSignal) => ({
        id: signal.id,
        title: signal.title,
        summary: signal.source,
        source: 'official_feed',
        confidence: 'high',
        tags: signal.tags || [],
        url: signal.url,
        publishedAt: signal.publishedAt,
      })),
    [watchtower.results]
  );

  const researchSignals: ProtocolResearchSignal[] = useMemo(
    () =>
      pubmed.articles.slice(0, 5).map((article) => ({
        id: article.pmid,
        title: article.title,
        summary: `${article.journal} • ${article.pubDate}`,
        source: 'research_evidence',
        confidence: 'medium',
        tags: ['pubmed', ...(protocol?.title ? [protocol.title.toLowerCase()] : [])],
        url: article.url,
        publishedAt: article.pubDate,
      })),
    [pubmed.articles, protocol?.title]
  );

  return (
    <div className="flex h-full flex-col border-l border-nerv-brown bg-nerv-void">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        
        {/* Curated Protocol Theses */}
        <CollapsibleSection
          title="Curated Protocol Theses"
          icon={<Database className="h-4 w-4 text-nerv-orange" />}
          isOpen={sections.theses}
          onToggle={() => toggleSection('theses')}
        >
          {localEvidence.length ? (
            <div className="space-y-2">
              {localEvidence.map((item) => (
                <ResearchCard key={item.id} signal={item} />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-nerv-rust">No local biotech or health thesis matched this query.</div>
          )}
        </CollapsibleSection>

        {/* Biomarker Trigger Board */}
        <CollapsibleSection
          title="Biomarker Trigger Board"
          icon={<Activity className="h-4 w-4 text-nerv-orange" />}
          isOpen={sections.biomarkers}
          onToggle={() => toggleSection('biomarkers')}
        >
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
        </CollapsibleSection>

        {/* Watchtower Signals */}
        <CollapsibleSection
          title="Watchtower Signals"
          icon={<Radar className="h-4 w-4 text-nerv-orange" />}
          isOpen={sections.watchtower}
          onToggle={() => toggleSection('watchtower')}
          isLoading={watchtower.loading}
          error={watchtower.error}
        >
          {officialSignals.length ? (
            <div className="space-y-2">
              {officialSignals.slice(0, 8).map((signal) => (
                <ResearchCard key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-nerv-rust">No Watchtower items matched this query.</div>
          )}
        </CollapsibleSection>

        {/* PubMed Research */}
        <CollapsibleSection
          title="PubMed Research"
          icon={<Microscope className="h-4 w-4 text-nerv-orange" />}
          isOpen={sections.pubmed}
          onToggle={() => toggleSection('pubmed')}
          isLoading={pubmed.loading}
          error={pubmed.error}
        >
          {researchSignals.length ? (
            <div className="space-y-2">
              {researchSignals.slice(0, 6).map((signal) => (
                <ResearchCard key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-nerv-rust">No PubMed results loaded for this query.</div>
          )}
        </CollapsibleSection>

        {/* Protocol Consultant */}
        <CollapsibleSection
          title="Protocol Consultant"
          icon={<ShieldPlus className="h-4 w-4 text-nerv-orange" />}
          isOpen={sections.consultant}
          onToggle={() => toggleSection('consultant')}
          isLoading={consultant.loading}
          error={consultant.error}
        >
          {consultant.response ? (
            <div className="border border-nerv-brown bg-nerv-void p-3 text-[11px] text-nerv-amber whitespace-pre-wrap leading-relaxed">
              {consultant.response}
            </div>
          ) : (
            <div className="text-[11px] text-nerv-rust">No consultant response available.</div>
          )}
        </CollapsibleSection>
      </div>
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
}

function CollapsibleSection({ title, icon, isOpen, onToggle, children, isLoading, error }: CollapsibleSectionProps) {
  return (
    <div className="nerv-panel-angular nerv-corner-accent relative bg-nerv-void-panel border border-orange-500/30">
      <div className="corner-bl"></div>
      <div className="corner-br"></div>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-nerv-void/50 transition-colors nerv-angular"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="nerv-panel-title-serif">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-nerv-orange" />}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-nerv-rust" />
          ) : (
            <ChevronDown className="h-4 w-4 text-nerv-rust" />
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3">
          {error && (
            <div className="mb-3 border border-nerv-amber/20 bg-nerv-void p-3 text-[11px] text-nerv-amber">
              {error}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Research Card Component
function ResearchCard({ signal }: { signal: ProtocolResearchSignal }) {
  return (
    <a
      href={signal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block nerv-angular-tl border border-nerv-brown bg-nerv-void p-3 transition-colors hover:border-nerv-orange/30 hover:bg-nerv-orange/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="nerv-mono text-[11px] text-nerv-amber">{signal.title}</div>
          <div className="mt-1 text-[10px] text-nerv-rust nerv-label">{signal.summary}</div>
        </div>
        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-nerv-rust" />
      </div>
    </a>
  );
}
