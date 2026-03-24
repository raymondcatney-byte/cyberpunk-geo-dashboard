import { useMemo, useState, useCallback, useRef } from 'react';
import {
  Target,
  Clock,
  DollarSign,
  Shield,
  Zap,
  Play,
  RefreshCw,
  ChevronRight,
  BarChart3,
  AlertOctagon,
  Brain,
  ExternalLinkIcon,
} from 'lucide-react';
import { generateResponse } from '../config/persona';
import { WARROOM_INTEL_PROMPT } from '../config/prompts';
import { composeSystemPrompt } from '../config/responseStyle';
import { useLiveData } from '../hooks/useLiveData';
import { useNationIntel } from '../hooks/useNationIntel';
import type { WatchtowerResult } from './WatchtowerConsole';
import { LayerControlPanel } from './LayerControlPanel';
import { DualMap } from './DualMap';
import { WorldBriefPanel } from './WorldBriefPanel';
import { LiveFeedPanel } from './LiveFeedPanel';
import { HotspotMonitorPanel } from './HotspotMonitorPanel';
import { CIIPanel } from './CIIPanel';
import { FinancialLayerControl } from './FinancialLayerControl';
import { PolymarketOracleCard } from './PolymarketOracleCard';
import type { GeopoliticalGlobeHandle } from './GeopoliticalGlobe';
import { OnChainWhaleWatcher } from './OnChainWhaleWatcher';
import { DeFiYieldRadar } from './DeFiYieldRadar';
import { NationIntelPanel } from './NationIntelPanel';

type Citation = { title: string; url: string; snippet?: string };

type ScenarioBlock = {
  probability: number;
  summary: string;
  timeline: string;
  triggers: string[];
  indicators: string[];
  recommended_actions: string[];
  adversary_countermoves: string[];
  hedges: string[];
};

type WarRoomOutput = {
  strategic_reframe: string;
  likely: ScenarioBlock;
  most_likely: ScenarioBlock;
  highly_likely: ScenarioBlock;
};

function clampProbability(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((s) => s.trim().length > 0);
}

function normalizeScenario(v: unknown): ScenarioBlock {
  const o = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  return {
    probability: clampProbability(o.probability),
    summary: typeof o.summary === 'string' ? o.summary : '',
    timeline: typeof o.timeline === 'string' ? o.timeline : '',
    triggers: toStringArray(o.triggers),
    indicators: toStringArray(o.indicators),
    recommended_actions: toStringArray(o.recommended_actions),
    adversary_countermoves: toStringArray(o.adversary_countermoves),
    hedges: toStringArray(o.hedges),
  };
}

function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === '\\') { escape = true; continue; }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth++;
    if (ch === '}') { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
  return null;
}

function parseWarRoomOutput(raw: string): WarRoomOutput | null {
  const json = extractFirstJsonObject(raw);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as unknown;
    const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    if (!obj) return null;
    const strategic_reframe = typeof obj.strategic_reframe === 'string' ? obj.strategic_reframe : '';
    const likely = normalizeScenario(obj.likely);
    const most_likely = normalizeScenario(obj.most_likely);
    const highly_likely = normalizeScenario(obj.highly_likely);
    if (!strategic_reframe.trim()) return null;
    return { strategic_reframe, likely, most_likely, highly_likely };
  } catch { return null; }
}

function summarizeList(list: string[], maxItems = 3) {
  const shown = list.slice(0, maxItems);
  return { shown, hiddenCount: Math.max(0, list.length - shown.length) };
}

interface WarRoomProps {
  topWatchtowerItem?: WatchtowerResult | null;
}

export function WarRoom({ topWatchtowerItem }: WarRoomProps) {
  const [scenarioInput, setScenarioInput] = useState('');
  const [timeframe, setTimeframe] = useState('12');
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<WarRoomOutput | null>(null);
  const [directiveResponse, setDirectiveResponse] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);

  // Nation intelligence
  const { selectedCountry, intel, selectCountry, clearSelection } = useNationIntel();

  // Globe ref for orbital targeting
  const globeRef = useRef<GeopoliticalGlobeHandle>(null);

  // Map mode state
  const [mapMode, setMapMode] = useState<'3d' | 'flat'>('3d');

  // Layer visibility state
  const [layers, setLayers] = useState({
    aircraft: false,
    satellites: false,
    earthquakes: false,
  });

  // Financial layer visibility state
  const [financialLayers, setFinancialLayers] = useState({
    polymarket: true,
    whales: true,
    yields: true,
  });

  // Live data hooks
  const { satellites, earthquakes: rawEarthquakes, loading, refresh } = useLiveData({
    satellitesEnabled: layers.satellites,
    earthquakesEnabled: false, // Disable to hide yellow dots
    satellitesInterval: 60000,
    earthquakesInterval: 60000,
  });

  const recentScenarios = useMemo(() => [
    { id: '1', title: 'Hostile board takeover attempt', date: '2 hours ago', risk: 'high' },
    { id: '2', title: 'Family wealth distribution dispute', date: '1 day ago', risk: 'medium' },
    { id: '3', title: 'Regulatory changes impact on portfolio', date: '3 days ago', risk: 'medium' },
    { id: '4', title: 'Strategic partnership opportunity', date: '1 week ago', risk: 'low' },
  ], []);

  const runSimulation = async () => {
    if (!scenarioInput.trim()) return;
    setIsSimulating(true);
    setDirectiveResponse('');
    setCitations([]);
    setResults(null);

    const simulationPrompt = [
      'WAR ROOM: Scenario Simulation',
      '',
      `Scenario: ${scenarioInput}`,
      `Timeframe: ${timeframe} months`,
      `Risk tolerance: ${riskLevel}`,
      '',
      'Return ONLY valid JSON. No markdown. No commentary outside JSON.',
      'Schema:',
      '{',
      '  "strategic_reframe": string,',
      '  "likely": { probability, summary, timeline, triggers[], indicators[], recommended_actions[], adversary_countermoves[], hedges[] },',
      '  "most_likely": { ...same },',
      '  "highly_likely": { ...same }',
      '}',
      '',
      'Rules:',
      '- strategic_reframe must be 2-4 paragraphs (no bullets)',
      '- each scenario.summary must be 2-3 paragraphs (no bullets)',
      '- probabilities are integers 0-100',
      '- timeline should be specific (e.g., "0-30 days", "3-6 months")',
      '- include at least 3 recommended_actions per scenario',
      '- focus on leverage, incentives, and second-order effects',
    ].join('\n');

    try {
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compound',
          systemPrompt: composeSystemPrompt(WARROOM_INTEL_PROMPT),
          message: simulationPrompt,
          history: [],
        }),
      });

      const data = (await response.json().catch(() => null)) as { ok?: boolean; content?: unknown; citations?: unknown; error?: unknown } | null;
      if (!response.ok || !data || data.ok !== true) throw new Error(String(data?.error || 'UPSTREAM'));

      const content = typeof data.content === 'string' ? data.content : '';
      const parsed = parseWarRoomOutput(content);

      const citationsRaw = Array.isArray(data.citations) ? data.citations : [];
      const normalizedCitations: Citation[] = citationsRaw
        .map((c) => (c && typeof c === 'object' ? (c as Record<string, unknown>) : null))
        .filter(Boolean)
        .map((c) => ({ title: typeof c!.title === 'string' ? c!.title : 'Source', url: typeof c!.url === 'string' ? c!.url : '', snippet: typeof c!.snippet === 'string' ? c!.snippet : undefined }))
        .filter((c) => Boolean(c.url));

      setCitations(normalizedCitations);
      if (parsed) { setResults(parsed); setDirectiveResponse(parsed.strategic_reframe); }
      else { setDirectiveResponse(content || 'Simulation completed. No output returned.'); }
    } catch {
      setDirectiveResponse(`${generateResponse(simulationPrompt)}\n\n*[Note: API call failed. Using fallback mode.]*`);
      setCitations([]);
      setResults(null);
    } finally { setIsSimulating(false); }
  };

  const ScenarioCard = ({ label, tone, data }: { label: string; tone: 'mint' | 'amber' | 'rose'; data: ScenarioBlock }) => {
    const toneBorder = tone === 'mint' ? 'border-green-500/30' : tone === 'amber' ? 'border-amber-500/30' : 'border-red-500/30';
    const toneText = tone === 'mint' ? 'text-green-400' : tone === 'amber' ? 'text-amber-400' : 'text-red-400';
    const actions = summarizeList(data.recommended_actions, 4);
    const indicators = summarizeList(data.indicators, 3);

    return (
      <div className={`p-4 bg-[#171717] rounded border ${toneBorder}`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-[12px] font-medium ${toneText}`}>{label}</div>
          <div className={`text-[18px] font-bold ${toneText}`}>{data.probability}%</div>
        </div>
        <div className="space-y-2 text-[11px] text-[#a3a3a3]">
          {data.timeline && <div className="flex items-center gap-1 text-[#737373]"><Clock className="w-3 h-3" /><span>{data.timeline}</span></div>}
          {data.summary && <p className="text-[12px] text-[#d4d4d4]">{data.summary}</p>}
          {actions.shown.length > 0 && (
            <div className="pt-2 border-t border-[#262626]">
              <div className="text-[10px] text-[#737373] mb-1">Recommended Actions</div>
              <ul className="list-disc list-inside space-y-1">{actions.shown.map((a, i) => <li key={i}>{a}</li>)}</ul>
              {actions.hiddenCount > 0 && <div className="text-[10px] text-[#525252] mt-1">+{actions.hiddenCount} more</div>}
            </div>
          )}
          {indicators.shown.length > 0 && (
            <div className="pt-2 border-t border-[#262626]">
              <div className="text-[10px] text-[#737373] mb-1">Indicators</div>
              <ul className="list-disc list-inside space-y-1">{indicators.shown.map((a, i) => <li key={i}>{a}</li>)}</ul>
              {indicators.hiddenCount > 0 && <div className="text-[10px] text-[#525252] mt-1">+{indicators.hiddenCount} more</div>}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleToggleLayer = (layer: 'aircraft' | 'satellites' | 'earthquakes') => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleToggleFinancialLayer = (layer: 'polymarket' | 'whales' | 'yields') => {
    setFinancialLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="p-4 border-b border-[#262626]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-amber-500 to-red-500 flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">War Room</h2>
            <p className="text-[10px] text-[#737373]">Scenario simulation and strategic planning</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Globe Section with Dual Map */}
          <div className="relative p-4 bg-nerv-void-panel border border-nerv-brown mb-4 shadow-[0_0_20px_rgba(232,160,60,0.1)]">
            <div className="h-[450px] relative">
              <DualMap
                mode={mapMode}
                onModeChange={setMapMode}
                layers={layers}
                aircraft={[]}
                satellites={satellites}
                earthquakes={[]}
                globeRef={globeRef}
              />
              
              {/* Floating Financial Cards */}
              <PolymarketOracleCard 
                enabled={financialLayers.polymarket} 
                position="top-right" 
                onSignalClick={(lat, lng, label) => globeRef.current?.flyTo(lat, lng, label)}
              />
              <OnChainWhaleWatcher enabled={financialLayers.whales} position="top-left" />
              <DeFiYieldRadar enabled={financialLayers.yields} position="bottom-left" />
            </div>
          </div>

          {/* Situation Input */}
          <div className="p-4 bg-nerv-void-panel border border-nerv-brown mb-4 mt-6">
            <h3 className="text-[12px] font-header font-bold uppercase tracking-wider text-nerv-orange mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-nerv-orange" />
              Situation Input
            </h3>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wide text-nerv-rust mb-1">Scenario Description</div>
                <textarea
                  value={scenarioInput}
                  onChange={(e) => setScenarioInput(e.target.value)}
                  placeholder="Describe tactical situation for simulation..."
                  rows={3}
                  className="w-full bg-nerv-void border border-nerv-brown px-3 py-2 text-[12px] text-nerv-amber placeholder-nerv-rust resize-none focus:border-nerv-orange focus:ring-1 focus:ring-nerv-orange/30 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-nerv-rust mb-1">Timeframe</div>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full bg-nerv-void border border-nerv-brown px-3 py-2 text-[12px] text-nerv-amber focus:border-nerv-orange focus:ring-1 focus:ring-nerv-orange/30 transition-all font-mono"
                  >
                    <option value="3">3 months</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-nerv-rust mb-1">Risk Level</div>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full bg-nerv-void border border-nerv-brown px-3 py-2 text-[12px] text-nerv-amber focus:border-nerv-orange focus:ring-1 focus:ring-nerv-orange/30 transition-all font-mono"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wide text-nerv-rust mb-1">Resources</div>
                  <div className="w-full bg-nerv-void border border-nerv-brown px-3 py-2 text-[12px] text-nerv-rust flex items-center gap-2 font-mono">
                    <DollarSign className="w-3 h-3" />
                    <span>SIMULATED</span>
                  </div>
                </div>
              </div>

              <button
                onClick={runSimulation}
                disabled={!scenarioInput.trim() || isSimulating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-nerv-orange text-nerv-void font-bold font-mono uppercase tracking-wider border-0 hover:bg-nerv-orange/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(232,160,60,0.3)]"
              >
                {isSimulating ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /><span className="text-[12px]">PROCESSING...</span></>
                ) : (
                  <><Play className="w-4 h-4" /><span className="text-[12px]">Execute Simulation</span></>
                )}
              </button>
            </div>
          </div>

          {/* Results */}
          {(directiveResponse || results) && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-amber-500/10 rounded border border-blue-500/30">
                <h3 className="text-[14px] font-medium text-white mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                  Simulation Output
                </h3>
                <p className="text-[12px] text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">{directiveResponse}</p>
                {citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-[#262626]">
                    <div className="text-[10px] text-[#6bd5ff] uppercase tracking-wider mb-2">Sources</div>
                    <div className="space-y-1.5">
                      {citations.map((citation, idx) => (
                        <a key={`${citation.url}-${idx}`} href={citation.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-blue-300 hover:text-blue-200 transition-colors">
                          <ExternalLinkIcon className="w-3 h-3" />
                          <span className="truncate">{citation.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {results && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <ScenarioCard label="Likely" tone="amber" data={results.likely} />
                  <ScenarioCard label="Most likely" tone="mint" data={results.most_likely} />
                  <ScenarioCard label="Highly likely" tone="rose" data={results.highly_likely} />
                </div>
              )}

              {results && (results.most_likely.recommended_actions.length > 0 || results.most_likely.hedges.length > 0) && (
                <div className="p-4 bg-[#171717] rounded border border-[#262626]">
                  <h4 className="text-[12px] text-white font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Execution Notes (Most likely)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-[#a3a3a3]">
                    <div>
                      <div className="text-[10px] text-[#737373] mb-1">Adversary countermoves</div>
                      <ul className="list-disc list-inside space-y-1">{results.most_likely.adversary_countermoves.slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#737373] mb-1">Hedges</div>
                      <ul className="list-disc list-inside space-y-1">{results.most_likely.hedges.slice(0, 6).map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - World Monitor Panels */}
        <div className="w-full xl:w-[320px] border-t xl:border-t-0 xl:border-l border-[#262626] overflow-y-auto p-4 space-y-4">
          
          {/* Nation Intel Panel - Shows when country selected */}
          {selectedCountry && intel ? (
            <NationIntelPanel
              country={intel.country}
              countryCode={intel.countryCode}
              news={intel.news}
              markets={intel.markets}
              onBack={clearSelection}
            />
          ) : (
            <>
              {/* World Brief - AI Summary (focal points now clickable) */}
              <WorldBriefPanel enabled={true} onFocalPointClick={selectCountry} />

              {/* Hotspot Monitor (hotspots now clickable) */}
              <HotspotMonitorPanel enabled={true} onHotspotClick={(country) => selectCountry(country)} />

              {/* Country Instability Index */}
              <CIIPanel enabled={true} onCountryClick={selectCountry} />

              {/* Live Feed - Shows priority from Watchtower + recent items */}
              <LiveFeedPanel enabled={true} limit={8} priorityItem={topWatchtowerItem} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
