/**
 * Swarm Debate Generator
 * Uses Groq API to simulate 5 agents debating with shared synthesis context.
 */

import type { DomainAlert, SynthesisEvidenceRecord, SynthesisOpportunity } from './synthesis-engine';
import type { PolymarketEvent, WhaleTransaction, YieldPool } from './defi-apis';
import type { AgentId, SwarmConsensus, SwarmMessage } from './swarm-config';

interface RealTimeData {
  polymarket: PolymarketEvent[];
  yields: YieldPool[];
  whales: WhaleTransaction[];
  asset: string;
  synthesis?: {
    opportunities: SynthesisOpportunity[];
    alerts: DomainAlert[];
    evidence: SynthesisEvidenceRecord[];
  };
}

interface DebateResult {
  messages: SwarmMessage[];
  consensus: SwarmConsensus;
}

function getGroqApiKey(): string | null {
  if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    return process.env.NEXT_PUBLIC_GROQ_API_KEY;
  }
  if (typeof window !== 'undefined') {
    const savedKey = localStorage.getItem('ai_api_key_raw');
    const savedProvider = localStorage.getItem('ai_provider');
    if (savedKey && (savedProvider === 'grok' || savedKey.startsWith('gsk_'))) {
      return savedKey;
    }
  }
  return null;
}

function formatDataForPrompt(data: RealTimeData): string {
  const { polymarket, yields, whales, asset } = data;
  const synthesis = data.synthesis || { opportunities: [], alerts: [], evidence: [] };

  const relevantMarkets = polymarket
    .filter((market) => market.title.toLowerCase().includes(asset.toLowerCase()) || market.category.toLowerCase().includes('crypto'))
    .slice(0, 3);

  const relevantYields = yields
    .filter((yieldPool) =>
      yieldPool.symbol.toLowerCase().includes(asset.toLowerCase()) ||
      yieldPool.project.toLowerCase().includes(asset.toLowerCase())
    )
    .slice(0, 3);

  const recentWhales = whales.slice(0, 5);
  const relatedOpportunities = synthesis.opportunities
    .filter((item) => item.title.toLowerCase().includes(asset.toLowerCase()) || item.tags.some((tag) => tag.includes(asset.toLowerCase())))
    .slice(0, 3);
  const relatedEvidence = synthesis.evidence
    .filter((item) => item.title.toLowerCase().includes(asset.toLowerCase()) || item.tags.some((tag) => tag.includes(asset.toLowerCase())))
    .slice(0, 4);

  return `
REAL-TIME MARKET DATA FOR ${asset.toUpperCase()}:

PREDICTION MARKETS:
${relevantMarkets.length > 0
    ? relevantMarkets.map((market) => `- ${market.title}: ${Math.round(market.yesPrice * 100)}% yes, $${(market.volume / 1000000).toFixed(1)}M volume`).join('\n')
    : '- No direct markets found for this asset'}

YIELD OPPORTUNITIES:
${relevantYields.length > 0
    ? relevantYields.map((yieldPool) => `- ${yieldPool.symbol} on ${yieldPool.project}: ${yieldPool.apy.toFixed(1)}% APY, $${(yieldPool.tvl / 1000000).toFixed(1)}M TVL`).join('\n')
    : '- No direct yield data found for this asset'}

WHALE ACTIVITY:
${recentWhales.length > 0
    ? recentWhales.map((trade) => `- ${trade.type.toUpperCase()}: ${trade.value} ${trade.token} (${trade.confidence} confidence)`).join('\n')
    : '- No significant whale activity detected'}

RANKED SYNTHESIS OPPORTUNITIES:
${relatedOpportunities.length > 0
    ? relatedOpportunities.map((item) => `- ${item.domain}: ${item.title} | edge ${(item.edge * 100).toFixed(1)}% | confidence ${item.confidence}% | ${item.summary}`).join('\n')
    : '- No synthesis-specific opportunity mapped directly to this asset'}

SUPPORTING EVIDENCE:
${relatedEvidence.length > 0
    ? relatedEvidence.map((item) => `- ${item.domain}/${item.source}: ${item.title} | ${item.summary}`).join('\n')
    : '- No directly matched evidence records'}

DOMAIN ALERTS:
${synthesis.alerts.length > 0
    ? synthesis.alerts.slice(0, 3).map((alert) => `- ${alert.domain}: ${alert.title} | ${alert.summary}`).join('\n')
    : '- No priority alerts in the current window'}
`;
}

export async function generateSwarmDebate(asset: string, data: RealTimeData): Promise<DebateResult> {
  const apiKey = getGroqApiKey();
  const dataContext = formatDataForPrompt(data);

  const prompt = `You are simulating an investment committee debate for ${asset.toUpperCase()}.

${dataContext}

SIMULATE THIS EXACT DEBATE STRUCTURE:

1. Marc (Lead) opens with: "Analyzing ${asset.toUpperCase()}. Let me gather inputs from the specialists."
2. Marc asks Protocol Analyst about fundamentals and protocol quality.
3. Marc asks Sentiment Tracker about prediction markets, flows, and catalysts.
4. Marc asks Risk Officer about sizing, invalidation, and correlated risk.
5. Marc asks Contrarian where consensus might be wrong.
6. Marc synthesizes a final action with thesis, size, confidence, and key catalyst.

RULES:
- Use ONLY the real data provided above
- Use synthesis opportunities and evidence if they improve precision
- Be specific with numbers
- Consensus must include action (BUY/SELL/HOLD/ACCUMULATE/REDUCE/PASS), size (1-20%), confidence (50-95%), and thesis

Return ONLY a JSON object in this exact format:
{
  "messages": [
    {"agentId": "marc", "text": "..."},
    {"agentId": "protocol", "text": "..."}
  ],
  "consensus": {
    "action": "BUY",
    "size": 5,
    "confidence": 73,
    "thesis": "...",
    "entryPrice": 3200,
    "stopLoss": 2400
  }
}`;

  if (!apiKey) {
    return generateSimulatedDebate(asset, data);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'You are simulating an AI investment swarm. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from API');
    }

    const parsed = JSON.parse(content);

    return {
      messages: parsed.messages.map((message: { agentId: AgentId; text: string }, index: number) => ({
        id: `msg-${index}`,
        agentId: message.agentId,
        text: message.text,
        timestamp: Date.now() + index * 1000,
        isQuestion: message.text.includes('?'),
      })),
      consensus: {
        asset: asset.toUpperCase(),
        action: parsed.consensus.action,
        size: parsed.consensus.size,
        confidence: parsed.consensus.confidence,
        thesis: parsed.consensus.thesis,
        entryPrice: parsed.consensus.entryPrice,
        stopLoss: parsed.consensus.stopLoss,
        timestamp: Date.now(),
        agentInputs: {
          marc: 'Lead coordinator',
          protocol: 'Protocol analysis',
          sentiment: 'Sentiment analysis',
          risk: 'Risk assessment',
          contrarian: 'Contrarian view',
        },
      },
    };
  } catch (error) {
    console.error('[SwarmDebate] API failed, using fallback:', error);
    return generateSimulatedDebate(asset, data);
  }
}

function generateSimulatedDebate(asset: string, data: RealTimeData): DebateResult {
  const { polymarket, yields, whales } = data;
  const synthesis = data.synthesis || { opportunities: [], alerts: [], evidence: [] };
  const upperAsset = asset.toUpperCase();

  const bestMarket = polymarket[0];
  const bestYield = yields[0];
  const whaleBias = whales.filter((trade) => trade.type === 'buy').length > whales.filter((trade) => trade.type === 'sell').length ? 'bullish' : 'neutral';
  const supportingOpportunity = synthesis.opportunities.find((item) => item.title.toLowerCase().includes(asset.toLowerCase()));
  const supportingAlert = synthesis.alerts[0];

  const messages: SwarmMessage[] = [
    {
      id: 'msg-0',
      agentId: 'marc',
      text: `Analyzing ${upperAsset}. Let me gather inputs from the specialists on current positioning.`,
      timestamp: Date.now(),
      isQuestion: false,
    },
    {
      id: 'msg-1',
      agentId: 'marc',
      text: 'Protocol Analyst, what is your assessment of the fundamentals?',
      timestamp: Date.now() + 1000,
      isQuestion: true,
    },
    {
      id: 'msg-2',
      agentId: 'protocol',
      text: bestYield
        ? `${upperAsset} fundamentals are supported by ${bestYield.symbol} on ${bestYield.project} at ${bestYield.apy.toFixed(1)}% APY with $${(bestYield.tvl / 1000000).toFixed(0)}M TVL. ${supportingOpportunity?.domain === 'defi' ? supportingOpportunity.summary : 'Protocol quality looks stable enough for a tracked position.'}`
        : `${upperAsset} fundamentals are mixed. Limited yield coverage means we should keep size modest until more protocol evidence confirms.`,
      timestamp: Date.now() + 2000,
      isQuestion: false,
    },
    {
      id: 'msg-3',
      agentId: 'marc',
      text: 'Sentiment Tracker, what are flows and event markets signaling?',
      timestamp: Date.now() + 3000,
      isQuestion: true,
    },
    {
      id: 'msg-4',
      agentId: 'sentiment',
      text: bestMarket
        ? `Prediction markets price ${Math.round(bestMarket.yesPrice * 100)}% for ${bestMarket.title}. Whale activity is ${whaleBias} with ${whales.length} major transactions. ${supportingOpportunity ? `Synthesis also flags ${supportingOpportunity.title} at ${(supportingOpportunity.edge * 100).toFixed(1)}% edge.` : 'No higher-ranked synthesis match is directly tied to this asset.'}`
        : `Whale flows are ${whaleBias} with ${whales.length} tracked transactions. Prediction-market coverage is limited, so we should lean more on flows and risk discipline.`,
      timestamp: Date.now() + 4000,
      isQuestion: false,
    },
    {
      id: 'msg-5',
      agentId: 'marc',
      text: 'Risk Officer, what is the correct risk framework?',
      timestamp: Date.now() + 5000,
      isQuestion: true,
    },
    {
      id: 'msg-6',
      agentId: 'risk',
      text: `Use a 5% max paper position with a 25% downside stop. ${supportingAlert ? `Highest current cross-domain alert is ${supportingAlert.title}, so avoid oversizing into correlated stress.` : 'No acute cross-domain alert is forcing a hard reduction right now.'}`,
      timestamp: Date.now() + 6000,
      isQuestion: false,
    },
    {
      id: 'msg-7',
      agentId: 'marc',
      text: 'Contrarian, where might consensus be wrong?',
      timestamp: Date.now() + 7000,
      isQuestion: true,
    },
    {
      id: 'msg-8',
      agentId: 'contrarian',
      text: whaleBias === 'bullish'
        ? 'Bullish flows help, but crowded optimism can still unwind hard if catalysts slip. The edge only matters if timing and invalidation are respected.'
        : 'Mixed positioning can itself be an opportunity, especially when event pricing is thin and the market has not fully absorbed new information.',
      timestamp: Date.now() + 8000,
      isQuestion: false,
    },
    {
      id: 'msg-9',
      agentId: 'marc',
      text: generateConsensusStatement(upperAsset, bestYield, bestMarket, whaleBias, supportingOpportunity),
      timestamp: Date.now() + 9000,
      isQuestion: false,
    },
  ];

  const consensus: SwarmConsensus = {
    asset: upperAsset,
    action: determineAction(bestMarket, whaleBias),
    size: 5,
    confidence: bestMarket ? Math.round(bestMarket.yesPrice * 100) : 65,
    thesis: `${bestYield ? `Protocol carry is visible at ${bestYield.apy.toFixed(1)}% APY.` : 'Protocol data is limited.'} ${supportingOpportunity ? `Synthesis ranks ${supportingOpportunity.title} with ${(supportingOpportunity.edge * 100).toFixed(1)}% edge.` : 'No higher-ranked synthesis opportunity directly maps to this asset.'}`,
    timestamp: Date.now(),
    agentInputs: {
      marc: 'Lead coordinator',
      protocol: bestYield ? `TVL $${(bestYield.tvl / 1000000).toFixed(0)}M, ${bestYield.apy.toFixed(1)}% APY` : 'Limited data',
      sentiment: whaleBias,
      risk: 'Max 5%, stop 25% below entry',
      contrarian: whaleBias === 'bullish' ? 'Respect crowding risk' : 'Neutral positioning can be asymmetric',
    },
  };

  return { messages, consensus };
}

function generateConsensusStatement(
  asset: string,
  yieldData: YieldPool | undefined,
  market: PolymarketEvent | undefined,
  whaleBias: string,
  supportingOpportunity?: SynthesisOpportunity
): string {
  const action = determineAction(market, whaleBias);
  const size = 5;
  const confidence = market ? Math.round(market.yesPrice * 100) : 65;
  const catalystLine = supportingOpportunity ? ` Catalyst stack: ${supportingOpportunity.catalysts.slice(0, 2).join(' | ')}.` : '';

  return `Based on Protocol Analyst's ${yieldData ? 'positive' : 'mixed'} fundamental assessment, Sentiment Tracker's ${whaleBias} flow analysis, Risk Officer's 5% position limit, and Contrarian's asymmetry observation, consensus is ${action} at ${size}% with ${confidence}% confidence. Thesis: ${yieldData ? `Sustainable yield with ${yieldData.apy.toFixed(1)}% APY supports` : 'Limited fundamental data suggests cautious'} ${action.toLowerCase()} positioning given current ${whaleBias} flows.${catalystLine}`;
}

function determineAction(market: PolymarketEvent | undefined, whaleBias: string): SwarmConsensus['action'] {
  if (!market) return 'HOLD';

  const probability = market.yesPrice;
  if (probability > 0.7 && whaleBias === 'bullish') return 'BUY';
  if (probability > 0.6 && whaleBias === 'bullish') return 'ACCUMULATE';
  if (probability < 0.3 && whaleBias === 'bearish') return 'SELL';
  if (probability < 0.4 && whaleBias === 'bearish') return 'REDUCE';
  if (probability > 0.5 && whaleBias !== 'bullish') return 'HOLD';
  return 'PASS';
}