'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Save, 
  X, 
  CheckCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Clock,
  Brain,
  Target,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { SWARM_AGENTS, type SwarmDecision, type SwarmConsensus, type SwarmMessage, type AgentId } from '../lib/swarm-config';
import { generateSwarmDebate } from '../lib/swarm-debate';
import { addDecision, updateDecisionStatus, getRecentDecisions, getDecisionStats } from '../lib/swarm-memory';
import { fetchPolymarketEvents, fetchYieldOpportunities, fetchWhaleTransactions } from '../lib/defi-apis';
import type { DomainAlert, SynthesisEvidenceRecord, SynthesisOpportunity } from '../lib/synthesis-engine';

// Color mapping for agents - mapped to warm tones
const AGENT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  cyan: { bg: 'bg-nerv-orange/10', text: 'text-nerv-orange', border: 'border-nerv-orange/40' },
  amber: { bg: 'bg-nerv-amber/10', text: 'text-nerv-amber', border: 'border-nerv-amber/40' },
  purple: { bg: 'bg-nerv-rust/10', text: 'text-nerv-rust', border: 'border-nerv-rust/40' },
  red: { bg: 'bg-nerv-alert/10', text: 'text-nerv-alert', border: 'border-nerv-alert/40' },
  indigo: { bg: 'bg-nerv-orange/10', text: 'text-nerv-orange', border: 'border-nerv-orange/30' },
};

// Action colors - BUY bright, SELL dim
const ACTION_COLORS: Record<string, string> = {
  BUY: 'text-nerv-amber',
  ACCUMULATE: 'text-nerv-amber',
  SELL: 'text-nerv-rust',
  REDUCE: 'text-nerv-rust',
  HOLD: 'text-nerv-orange',
  PASS: 'text-nerv-rust',
};

const ACTION_BG: Record<string, string> = {
  BUY: 'bg-nerv-amber/10 border-nerv-amber/40',
  ACCUMULATE: 'bg-nerv-amber/10 border-nerv-amber/40',
  SELL: 'bg-nerv-rust/10 border-nerv-rust/40',
  REDUCE: 'bg-nerv-rust/10 border-nerv-rust/40',
  HOLD: 'bg-nerv-orange/10 border-nerv-orange/40',
  PASS: 'bg-nerv-rust/10 border-nerv-rust/30',
};

interface SwarmPanelProps {
  className?: string;
  sharedData?: {
    polymarket: any[];
    yields: any[];
    whales: any[];
    synthesis?: {
      opportunities: SynthesisOpportunity[];
      alerts: DomainAlert[];
      evidence: SynthesisEvidenceRecord[];
    };
  };
}

export function SwarmPanel({ className, sharedData }: SwarmPanelProps) {
  // State
  const [asset, setAsset] = useState('ETH');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [messages, setMessages] = useState<SwarmMessage[]>([]);
  const [consensus, setConsensus] = useState<SwarmConsensus | null>(null);
  const [currentDecisionId, setCurrentDecisionId] = useState<string | null>(null);
  const [memory, setMemory] = useState<SwarmDecision[]>([]);
  const [stats, setStats] = useState({ total: 0, buy: 0, sell: 0, hold: 0, pass: 0, avgConfidence: 0 });
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Data refs for real-time feeding
  const polymarketRef = useRef<any[]>([]);
  const yieldsRef = useRef<any[]>([]);
  const whalesRef = useRef<any[]>([]);
  const synthesisRef = useRef<{ opportunities: SynthesisOpportunity[]; alerts: DomainAlert[]; evidence: SynthesisEvidenceRecord[] }>({
    opportunities: [],
    alerts: [],
    evidence: [],
  });

  // Load memory on mount
  useEffect(() => {
    setMemory(getRecentDecisions(10));
    setStats(getDecisionStats());

    void loadData();
  }, []);

  // Load real-time data
  const loadData = async () => {
    if (sharedData) {
      polymarketRef.current = sharedData.polymarket;
      yieldsRef.current = sharedData.yields;
      whalesRef.current = sharedData.whales;
      synthesisRef.current = sharedData.synthesis || { opportunities: [], alerts: [], evidence: [] };
      setDataLoaded(true);
      return;
    }

    try {
      const [poly, yld, whl] = await Promise.all([
        fetchPolymarketEvents(10),
        fetchYieldOpportunities(10),
        fetchWhaleTransactions(10)
      ]);
      polymarketRef.current = poly;
      yieldsRef.current = yld;
      whalesRef.current = whl;
      synthesisRef.current = { opportunities: [], alerts: [], evidence: [] };
      setDataLoaded(true);
    } catch (e) {
      console.error('[SwarmPanel] Failed to load data:', e);
      setDataLoaded(true); // Continue with empty data
    }
  };

  useEffect(() => {
    if (!sharedData) return;
    void loadData();
  }, [sharedData]);

  // Animate messages appearing
  useEffect(() => {
    if (messages.length > 0 && visibleMessages < messages.length) {
      const timer = setTimeout(() => {
        setVisibleMessages(v => v + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [messages, visibleMessages]);

  // Run analysis
  const runAnalysis = async () => {
    if (!asset.trim() || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setMessages([]);
    setConsensus(null);
    setVisibleMessages(0);
    setCurrentDecisionId(null);
    
    // Ensure data is fresh
    await loadData();
    
    // Generate debate
    const result = await generateSwarmDebate(asset, {
      polymarket: polymarketRef.current,
      yields: yieldsRef.current,
      whales: whalesRef.current,
      asset: asset.toUpperCase(),
      synthesis: synthesisRef.current,
    });
    
    setMessages(result.messages);
    setConsensus(result.consensus);
    
    // Save to memory
    const decision: SwarmDecision = {
      id: `decision-${Date.now()}`,
      asset: asset.toUpperCase(),
      consensus: result.consensus,
      messages: result.messages,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    addDecision(decision);
    setCurrentDecisionId(decision.id);
    setMemory(getRecentDecisions(10));
    setStats(getDecisionStats());
    
    setIsAnalyzing(false);
  };

  // Handle decision actions
  const handleExecute = () => {
    if (currentDecisionId) {
      console.log('[Swarm] Executing decision:', currentDecisionId, consensus);
      updateDecisionStatus(currentDecisionId, 'executed');
      setMemory(getRecentDecisions(10));
    }
  };

  const handleSave = () => {
    if (currentDecisionId) {
      updateDecisionStatus(currentDecisionId, 'saved');
      setMemory(getRecentDecisions(10));
    }
  };

  const handleDismiss = () => {
    if (currentDecisionId) {
      updateDecisionStatus(currentDecisionId, 'dismissed');
      setConsensus(null);
      setMessages([]);
      setCurrentDecisionId(null);
      setMemory(getRecentDecisions(10));
    }
  };

  // Get icon for action
  const getActionIcon = (action: string) => {
    if (action === 'BUY' || action === 'ACCUMULATE') return <TrendingUp className="w-5 h-5" />;
    if (action === 'SELL' || action === 'REDUCE') return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-nerv-void-panel border border-nerv-brown p-3">
          <div className="text-[10px] text-nerv-rust uppercase tracking-wider font-mono">Total Decisions</div>
          <div className="text-xl font-mono text-nerv-amber">{stats.total}</div>
        </div>
        <div className="bg-nerv-void-panel border border-nerv-brown p-3">
          <div className="text-[10px] text-nerv-rust uppercase tracking-wider font-mono">Buy/Accumulate</div>
          <div className="text-xl font-mono text-nerv-amber">{stats.buy}</div>
        </div>
        <div className="bg-nerv-void-panel border border-nerv-brown p-3">
          <div className="text-[10px] text-nerv-rust uppercase tracking-wider font-mono">Sell/Reduce</div>
          <div className="text-xl font-mono text-nerv-rust">{stats.sell}</div>
        </div>
        <div className="bg-nerv-void-panel border border-nerv-brown p-3">
          <div className="text-[10px] text-nerv-rust uppercase tracking-wider font-mono">Avg Confidence</div>
          <div className="text-xl font-mono text-nerv-orange">{stats.avgConfidence}%</div>
        </div>
      </div>

      {/* Asset Input */}
      <div className="bg-nerv-void-panel border border-nerv-brown p-4">
        <div className="flex items-center gap-3 mb-3">
          <Brain className="w-5 h-5 text-nerv-orange" />
          <span className="text-sm font-medium text-nerv-amber">Asset Analysis</span>
          {!dataLoaded && (
            <span className="text-[10px] text-nerv-rust flex items-center gap-1 font-mono">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading shared intel...
            </span>
          )}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={asset}
            onChange={(e) => setAsset(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
            placeholder="Enter asset (ETH, BTC, SOL...)"
            className="flex-1 bg-nerv-void border border-nerv-brown px-4 py-2.5 text-sm text-nerv-amber placeholder-nerv-rust focus:border-nerv-orange/50 focus:outline-none font-mono uppercase"
          />
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing || !asset.trim() || !dataLoaded}
            className="flex items-center gap-2 px-5 py-2.5 bg-nerv-orange/10 text-nerv-orange border border-nerv-orange/40 hover:bg-nerv-orange/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </div>
        
        <p className="text-[10px] text-nerv-rust mt-2 font-mono">
          Swarm will analyze using shared prediction, DeFi, energy, and ranked evidence context.
        </p>
      </div>

      {/* Swarm Messages */}
      {(messages.length > 0 || isAnalyzing) && (
        <div className="bg-nerv-void-panel border border-nerv-brown p-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-nerv-orange" />
            <span className="text-sm font-medium text-nerv-amber">Swarm Activity</span>
            {isAnalyzing && (
              <span className="text-[10px] text-nerv-orange animate-pulse font-mono">
                Debating...
              </span>
            )}
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
            {messages.slice(0, visibleMessages).map((msg, idx) => {
              const agent = SWARM_AGENTS[msg.agentId];
              const colors = AGENT_COLORS[agent.color];
              
              return (
                <div 
                  key={msg.id}
                  className={`flex gap-3 p-3 border ${colors.border} ${colors.bg} animate-in fade-in slide-in-from-left-2 duration-300`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`w-10 h-10 flex items-center justify-center text-lg flex-shrink-0 bg-nerv-void border border-nerv-brown`}>
                    {agent.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${colors.text}`}>
                        {agent.name}
                      </span>
                      <span className="text-[10px] text-nerv-rust font-mono">
                        {agent.role === 'lead' ? 'Lead' : 'Specialist'}
                      </span>
                      {msg.isQuestion && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-nerv-void text-nerv-orange border border-nerv-brown">
                          Q
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-nerv-amber leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {isAnalyzing && visibleMessages >= messages.length && (
              <div className="flex items-center gap-2 text-nerv-rust text-sm p-3 font-mono">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Marc synthesizing consensus...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Consensus Card with orange glow */}
      {consensus && !isAnalyzing && (
        <div className="bg-gradient-to-br from-nerv-void-panel to-nerv-void border-2 border-nerv-orange/40 p-6 animate-in zoom-in-95 duration-300 shadow-[0_0_20px_rgba(219,120,40,0.15)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-nerv-orange" />
              <span className="text-lg font-bold text-nerv-amber">SWARM CONSENSUS</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-nerv-orange animate-pulse" />
              <span className="text-nerv-orange font-mono text-lg">{consensus.confidence}%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`p-4 border ${ACTION_BG[consensus.action] || 'bg-nerv-void-panel border-nerv-brown'}`}>
              <div className="text-[10px] uppercase tracking-wider text-nerv-rust mb-1 font-mono">Action</div>
              <div className={`text-2xl font-bold ${ACTION_COLORS[consensus.action] || 'text-nerv-rust'} flex items-center gap-2`}>
                {getActionIcon(consensus.action)}
                {consensus.action}
              </div>
            </div>
            <div className="bg-nerv-void p-4 border border-nerv-brown">
              <div className="text-[10px] uppercase tracking-wider text-nerv-rust mb-1 font-mono">Position Size</div>
              <div className="text-2xl font-bold text-nerv-amber">{consensus.size}%</div>
            </div>
            <div className="bg-nerv-void p-4 border border-nerv-brown">
              <div className="text-[10px] uppercase tracking-wider text-nerv-rust mb-1 font-mono">Asset</div>
              <div className="text-2xl font-bold text-nerv-amber">{consensus.asset}</div>
            </div>
          </div>

          {consensus.entryPrice && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-nerv-void p-3 border border-nerv-brown">
                <div className="text-[10px] uppercase tracking-wider text-nerv-rust font-mono">Entry Target</div>
                <div className="text-lg font-mono text-nerv-amber">${consensus.entryPrice.toLocaleString()}</div>
              </div>
              {consensus.stopLoss && (
                <div className="bg-nerv-void p-3 border border-nerv-brown">
                  <div className="text-[10px] uppercase tracking-wider text-nerv-rust font-mono">Stop Loss</div>
                  <div className="text-lg font-mono text-nerv-alert">${consensus.stopLoss.toLocaleString()}</div>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-nerv-void p-4 border border-nerv-brown mb-4">
            <div className="text-[10px] uppercase tracking-wider text-nerv-rust mb-2 font-mono">Investment Thesis</div>
            <p className="text-sm text-nerv-amber italic">
              "{consensus.thesis}"
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExecute}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-nerv-orange/10 text-nerv-orange border border-nerv-orange/40 hover:bg-nerv-orange/20 transition-all font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Execute (Log)
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-3 bg-nerv-void-panel text-nerv-orange border border-nerv-brown hover:bg-nerv-void transition-all"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="px-5 py-3 bg-nerv-void-panel text-nerv-rust border border-nerv-brown hover:bg-nerv-alert/10 hover:text-nerv-alert hover:border-nerv-alert/40 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Swarm Memory */}
      {memory.length > 0 && (
        <div className="bg-nerv-void-panel border border-nerv-brown p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-nerv-orange" />
            <span className="text-sm font-medium text-nerv-amber">Swarm Memory</span>
            <span className="text-[10px] text-nerv-rust font-mono">({memory.length} recent)</span>
          </div>
          
          <div className="space-y-2">
            {memory.map((decision) => (
              <div 
                key={decision.id}
                className="flex items-center justify-between p-3 bg-nerv-void border border-nerv-brown hover:border-nerv-orange/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${ACTION_COLORS[decision.consensus.action] || 'text-nerv-rust'}`}>
                    {decision.consensus.action}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-nerv-amber">
                      {decision.asset} @ {decision.consensus.size}%
                    </div>
                    <div className="text-[10px] text-nerv-rust font-mono">
                      {new Date(decision.timestamp).toLocaleDateString()} | {decision.consensus.confidence}% confidence
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {decision.status === 'executed' && (
                    <span className="text-[10px] px-2 py-1 bg-nerv-amber/10 text-nerv-amber border border-nerv-amber/30">Executed</span>
                  )}
                  {decision.status === 'saved' && (
                    <span className="text-[10px] px-2 py-1 bg-nerv-orange/10 text-nerv-orange border border-nerv-orange/30">Saved</span>
                  )}
                  {decision.status === 'dismissed' && (
                    <span className="text-[10px] px-2 py-1 bg-nerv-rust/10 text-nerv-rust border border-nerv-rust/20">Dismissed</span>
                  )}
                  {decision.status === 'pending' && (
                    <span className="text-[10px] px-2 py-1 bg-nerv-orange/10 text-nerv-orange border border-nerv-orange/30">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {memory.length === 0 && !isAnalyzing && messages.length === 0 && (
        <div className="bg-nerv-void-panel border border-nerv-brown p-8 text-center">
          <Brain className="w-12 h-12 text-nerv-rust mx-auto mb-4" />
          <p className="text-nerv-orange mb-2">No swarm decisions yet</p>
          <p className="text-sm text-nerv-rust font-mono">
            Enter an asset and click Analyze to start the investment committee
          </p>
        </div>
      )}
    </div>
  );
}
