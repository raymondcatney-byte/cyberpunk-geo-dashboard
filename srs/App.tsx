import { useCallback, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { BroadcastMonitor } from './components/BroadcastMonitor';
import { Chat } from './components/Chat';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HUD } from './components/HUD';
import { IntelBank } from './components/IntelBank';
import { Overwatch } from './components/Overwatch';
import { ProtocolDetail } from './components/ProtocolDetail';
import { ProtocolKnowledgeWorkbench } from './components/ProtocolKnowledgeWorkbench';
import { ProtocolsPromptBar } from './components/ProtocolsPromptBar';
import { Settings } from './components/Settings';
import { WarRoom } from './components/WarRoom';
import { WatchtowerConsole, type WatchtowerResult } from './components/WatchtowerConsole';
import AgentPage from './app/agent/page';

import { DEFAULT_PROTOCOLS, generateResponse, type Message, type Protocol } from './config/persona';
import { ARCHITECT_PROMPT, WARROOM_INTEL_PROMPT } from './config/prompts';
import { composeSystemPrompt } from './config/responseStyle';
import { extractBiomarkers } from './lib/protocol/biomarker-parser';
import { callGroqPersona } from './lib/groq-client';
import { useSynthesis } from './hooks/useSynthesis';
import { CRTOverlay } from './components/CRTOverlay';
import './styles/nerv-theme.css';


type TabType = 'communications' | 'protocols' | 'intel' | 'warroom' | 'overwatch' | 'settings' | 'agent';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type Citation = { title: string; url: string; snippet?: string };

async function callCompound(
  message: string,
  systemPrompt: string,
  history: ChatTurn[],
  context?: Record<string, unknown>
) {
  return callGroqPersona({
    message,
    persona: 'bruce',
    systemPrompt: composeSystemPrompt(systemPrompt),
    history,
    context,
  });
}

function lastOf(messages: Message[], role: Message['role']): Message | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === role) return messages[i] ?? null;
  }
  return null;
}

type WatchtowerApiResponse = {
  ok: boolean;
  query?: string;
  total?: number;
  results?: WatchtowerResult[];
  error?: string;
};

export default function App() {
  const standaloneView =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;

  if (standaloneView === 'broadcast-monitor') {
    return <BroadcastMonitor />;
  }

  const [activeTab, setActiveTab] = useState<TabType>('communications');

  // Layer visibility state (lifted from WarRoom for HUD access)
  const [dataLayers, setDataLayers] = useState({
    satellites: false,
    earthquakes: false,
  });
  
  const [financialLayers, setFinancialLayers] = useState({
    polymarket: true,
    whales: true,
    yields: true,
    causation: true,
  });

  // Comms chat log
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Watchtower state (Comms)
  const [watchtowerQuery, setWatchtowerQuery] = useState('');
  const [watchtowerResults, setWatchtowerResults] = useState<WatchtowerResult[]>([]);
  const [watchtowerLoading, setWatchtowerLoading] = useState(false);
  const [watchtowerError, setWatchtowerError] = useState<string | null>(null);

  // Protocols prompt log (kept separate so it doesn't pollute Comms)
  const [protocolPromptMessages, setProtocolPromptMessages] = useState<Message[]>([]);
  const [isProtocolTyping, setIsProtocolTyping] = useState(false);

  // Protocol Consultant state (left sidebar)
  const [consultantQuery, setConsultantQuery] = useState('');
  const [consultantResponse, setConsultantResponse] = useState<string | null>(null);
  const [consultantLoading, setConsultantLoading] = useState(false);
  const [consultantError, setConsultantError] = useState<string | null>(null);

  // Latest response tracker (for middle panel display)
  type ResponseSource = 'bruce' | 'consultant' | null;
  const [lastResponseSource, setLastResponseSource] = useState<ResponseSource>(null);

  const [protocols, setProtocols] = useState<Protocol[]>(DEFAULT_PROTOCOLS);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const { bruceContext, synthesis } = useSynthesis(true, 75_000);

  const history: ChatTurn[] = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  );

  const protocolHistory: ChatTurn[] = useMemo(
    () => protocolPromptMessages.map((m) => ({ role: m.role, content: m.content })),
    [protocolPromptMessages]
  );

  const runWatchtowerLatest = useCallback(async () => {
    setWatchtowerLoading(true);
    setWatchtowerError(null);

    try {
      const res = await fetch('/api/watchtower/items?limit=30');
      const data = (await res.json()) as WatchtowerApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || 'UPSTREAM');
      setWatchtowerResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setWatchtowerResults([]);
      setWatchtowerError('Intel stream unavailable. Some feeds may be rate-limited or degraded.');
    } finally {
      setWatchtowerLoading(false);
    }
  }, []);

  const runWatchtowerSearch = useCallback(async () => {
    const q = watchtowerQuery.trim();
    if (!q) {
      await runWatchtowerLatest();
      return;
    }

    setWatchtowerLoading(true);
    setWatchtowerError(null);

    try {
      const res = await fetch(`/api/watchtower/search?q=${encodeURIComponent(q)}&limit=30`);
      const data = (await res.json()) as WatchtowerApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || 'UPSTREAM');
      setWatchtowerResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setWatchtowerResults([]);
      setWatchtowerError('Intel stream unavailable. Some feeds may be rate-limited or degraded.');
    } finally {
      setWatchtowerLoading(false);
    }
  }, [watchtowerQuery, runWatchtowerLatest]);

  const handleApiCall = useCallback(async (text: string, systemPrompt: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    let assistantText = '';
    let citations: Citation[] = [];

    try {
      const r = await callCompound(text, systemPrompt, history, {
        ...bruceContext,
        requestedView: 'communications',
      });
      assistantText = r.content;
      citations = r.citations;
    } catch {
      assistantText = `${generateResponse(text)}\n\n*[Note: API call failed. Using fallback mode.]*`;
    } finally {
      setIsTyping(false);
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: assistantText,
      timestamp: new Date(),
      citations: citations.length ? citations : undefined,
    };

    setMessages((prev) => [...prev, assistantMessage]);
  }, [bruceContext, history]);

  const handleProtocolsPrompt = useCallback(async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setProtocolPromptMessages((prev) => [...prev, userMessage]);
    setIsProtocolTyping(true);

    let assistantText = '';
    let citations: Citation[] = [];

    try {
      const r = await callCompound(text, ARCHITECT_PROMPT, protocolHistory, {
        ...bruceContext,
        requestedView: 'protocols',
        preferredDomain: 'biotech',
        biotechSignals: synthesis.biotechSignals,
        biotechEvidence: synthesis.evidence.filter((item) => item.domain === 'biotech').slice(0, 8),
      });
      assistantText = r.content;
      citations = r.citations;
    } catch {
      assistantText = `${generateResponse(text)}\n\n*[Note: API call failed. Using fallback mode.]*`;
    } finally {
      setIsProtocolTyping(false);
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: assistantText,
      timestamp: new Date(),
      citations: citations.length ? citations : undefined,
    };

    setProtocolPromptMessages((prev) => [...prev, assistantMessage]);
  }, [bruceContext, protocolHistory, synthesis.biotechSignals, synthesis.evidence]);

  const handleSendMessage = useCallback(async (text: string) => {
    await handleApiCall(text, ARCHITECT_PROMPT);
  }, [handleApiCall]);

  const toggleProtocolStatus = (id: string) => {
    setProtocols((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: p.status === 'completed' ? 'pending' : 'completed' } : p
      )
    );
  };

  const handleProtocolSelect = useCallback((protocol: Protocol) => {
    setSelectedProtocol(protocol);
    setActiveTab('protocols');
  }, []);

  const handleProtocolClose = useCallback(() => {
    setSelectedProtocol(null);
  }, []);

  const handleProtocolToggle = useCallback(() => {
    if (selectedProtocol) {
      toggleProtocolStatus(selectedProtocol.id);
    }
  }, [selectedProtocol]);

  // Protocol Consultant function (left sidebar)
  const runProtocolConsultant = useCallback(async () => {
    const q = consultantQuery.trim();
    if (!q) return;

    setConsultantLoading(true);
    setConsultantError(null);
    setConsultantResponse(null);
    setLastResponseSource('consultant');

    const biomarkers = extractBiomarkers(q);

    try {
      const res = await fetch('/api/protocol-consultant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, biomarkers }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'API failed');
      
      setConsultantResponse(data.response);
    } catch (err) {
      setConsultantError(err instanceof Error ? err.message : 'Consultant unavailable');
    } finally {
      setConsultantLoading(false);
    }
  }, [consultantQuery]);

  const handleIntelSelect = useCallback((item: { title: string; category: string; summary: string }) => {
    const prompt = `Analyze this intelligence item and provide a strategic recommendation:\n\nTitle: ${item.title}\nCategory: ${item.category}\nSummary: ${item.summary}`;
    setActiveTab('communications');
    void handleApiCall(prompt, WARROOM_INTEL_PROMPT);
  }, [handleApiCall, setActiveTab]);

  // Layer toggle handlers
  const handleToggleDataLayer = useCallback((layer: 'satellites' | 'earthquakes') => {
    setDataLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const handleToggleFinancialLayer = useCallback((layer: 'polymarket' | 'whales' | 'yields' | 'causation') => {
    setFinancialLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  }, []);

  const protocolForDetail = selectedProtocol
    ? protocols.find((p) => p.id === selectedProtocol.id) ?? selectedProtocol
    : null;

  const lastProtocolUser = useMemo(() => lastOf(protocolPromptMessages, 'user'), [protocolPromptMessages]);
  const lastProtocolAssistant = useMemo(
    () => lastOf(protocolPromptMessages, 'assistant'),
    [protocolPromptMessages]
  );

  return (
    <ErrorBoundary>
      <CRTOverlay />
      <div className="h-dvh nerv-bg-void" style={{ color: 'var(--steel)' }}>
        <div className="h-full flex flex-col lg:flex-row">
          <div className="w-full h-[42dvh] min-h-[280px] lg:h-full lg:w-[360px] lg:min-w-[320px]">
            <HUD
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              protocols={protocols}
              onProtocolSelect={handleProtocolSelect}
              objectiveQuery={watchtowerQuery}
              setObjectiveQuery={setWatchtowerQuery}
              onObjectiveSubmit={runWatchtowerSearch}
              objectiveLoading={watchtowerLoading}
              objectiveError={watchtowerError}
              objectiveResultCount={watchtowerResults.length}
              consultantQuery={consultantQuery}
              setConsultantQuery={setConsultantQuery}
              onConsultantSubmit={runProtocolConsultant}
              consultantLoading={consultantLoading}
              consultantError={consultantError}
              // Layer toggles (shown when in warroom tab)
              dataLayers={dataLayers}
              financialLayers={financialLayers}
              onToggleDataLayer={handleToggleDataLayer}
              onToggleFinancialLayer={handleToggleFinancialLayer}
            />
          </div>

          <div className="flex-1 min-w-0 h-[58dvh] lg:h-full border-t border-[#262626] lg:border-t-0 lg:border-l">
            {activeTab === 'communications' && (
              <div className="h-full flex flex-col lg:flex-row">
                <div className="flex-1 min-w-0 border-b border-[#262626] lg:border-b-0 lg:border-r">
                  <WatchtowerConsole
                    query={watchtowerQuery}
                    results={watchtowerResults}
                    loading={watchtowerLoading}
                    error={watchtowerError}
                    onRefresh={runWatchtowerSearch}
                    onLoadLatest={runWatchtowerLatest}
                    onSendToComms={handleSendMessage}
                  />
                </div>
                <div className="w-full lg:w-[520px] lg:min-w-[520px] h-full">
                  <Chat messages={messages} onSendMessage={handleSendMessage} isTyping={isTyping} />
                </div>
              </div>
            )}

            {activeTab === 'protocols' && (
              <div className="h-full flex flex-col">
                <ProtocolsPromptBar
                  isTyping={isProtocolTyping}
                  lastUser={lastProtocolUser}
                  lastAssistant={lastProtocolAssistant}
                  onSubmit={handleProtocolsPrompt}
                  onResponseSubmitted={() => setLastResponseSource('bruce')}
                />

                <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
                  {/* Middle Panel - Shared Response Display */}
                  <div className="flex-1 min-w-0 h-full border-b border-[#262626] lg:border-b-0 lg:border-r bg-[#0a0a0a]">
                    {/* Loading State */}
                    {(isProtocolTyping || consultantLoading) && (
                      <div className="h-full flex items-center justify-center">
                        <div className="flex items-center gap-3">
                          <div className="w-5 h-5 border-2 border-[#262626] border-t-cyan-400 rounded-full animate-spin" />
                          <span className="text-[#888880] text-sm">
                            {isProtocolTyping ? 'Bruce analyzing...' : 'Protocol Consultant analyzing...'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Error State */}
                    {consultantError && lastResponseSource === 'consultant' && !consultantLoading && (
                      <div className="h-full flex items-center justify-center p-8">
                        <div className="text-red-400 text-center">
                          <p className="text-sm">{consultantError}</p>
                        </div>
                      </div>
                    )}

                    {/* Bruce Response */}
                    {!isProtocolTyping && !consultantLoading && lastResponseSource === 'bruce' && lastProtocolAssistant && (
                      <div className="h-full overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-[10px] uppercase tracking-widest text-amber-400/80">Bruce Wayne</span>
                          </div>
                          <div className="text-[14px] text-[#d4d4d4] whitespace-pre-wrap leading-relaxed">
                            {lastProtocolAssistant.content}
                          </div>
                          {lastProtocolAssistant.citations && lastProtocolAssistant.citations.length > 0 && (
                            <div className="mt-6 pt-4 border-t border-[#262626]">
                              <div className="text-[10px] uppercase tracking-widest text-blue-300/80 mb-3">Sources</div>
                              <div className="space-y-2">
                                {lastProtocolAssistant.citations.slice(0, 6).map((c) => (
                                  <a
                                    key={c.url}
                                    href={c.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-[11px] text-blue-300 hover:text-blue-200 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span className="truncate">{c.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Protocol Consultant Response */}
                    {!isProtocolTyping && !consultantLoading && lastResponseSource === 'consultant' && consultantResponse && (
                      <div className="h-full overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-[10px] uppercase tracking-widest text-cyan-400/80">Protocol Consultant</span>
                          </div>
                          <div className="text-[14px] text-[#d4d4d4] whitespace-pre-wrap leading-relaxed border-l-2 border-cyan-500/30 pl-4">
                            {consultantResponse}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {!isProtocolTyping && !consultantLoading && !lastResponseSource && (
                      <div className="h-full flex items-center justify-center text-[#888880] text-sm">
                        <div className="text-center">
                          <p>Use the search bar above for strategic analysis.</p>
                          <p className="text-xs text-[#525252] mt-2">Or use Protocol Consultant in the sidebar for health protocols.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="w-full lg:w-[520px] lg:min-w-[520px] h-full flex flex-col">
                    <div className="flex-1 min-h-0">
                      {protocolForDetail ? (
                        <ProtocolDetail
                          protocol={protocolForDetail}
                          onClose={handleProtocolClose}
                          onToggleStatus={handleProtocolToggle}
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-[#0c0c0a] border-l border-[#262626] text-[#888880] text-sm">
                          Select a protocol to view details.
                        </div>
                      )}
                    </div>
                    <div className="h-[48%] min-h-[360px]">
                      <ProtocolKnowledgeWorkbench
                        protocol={protocolForDetail}
                        query={consultantQuery || lastProtocolUser?.content || ''}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'intel' && (
              <IntelBank
                onSelectItem={handleIntelSelect}
                systemPrompt={WARROOM_INTEL_PROMPT}
              />
            )}

            {activeTab === 'warroom' && <WarRoom topWatchtowerItem={watchtowerResults[0] || null} />}
            {activeTab === 'agent' && <AgentPage />}
            {activeTab === 'overwatch' && <Overwatch />}
            {activeTab === 'settings' && <Settings />}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
