/**
 * Ghost Protocol Agent Core
 * Autonomous intelligence system with memory and tools
 */

// Memory Types
export type MemoryType = 'observation' | 'action' | 'insight' | 'goal';

export type Memory = {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: number;
  tags: string[];
  importance: number; // 1-10
};

// Goal Types
export type GoalStatus = 'active' | 'completed' | 'failed';

export type Goal = {
  id: string;
  description: string;
  status: GoalStatus;
  priority: number; // 1-10
  createdAt: number;
  completedAt?: number;
};

// Agent State
export type AgentState = {
  isRunning: boolean;
  lastCheck: number | null;
  interval: number; // minutes, 0 = off
  goals: Goal[];
  memories: Memory[];
  currentTask: string | null;
};

// Tool Types
export type ToolResult = {
  success: boolean;
  output: string;
  data?: any;
  error?: string;
};

// Storage keys
const STORAGE_KEY = 'ghost-protocol-memory';
const GOALS_KEY = 'ghost-protocol-goals';

// Memory Management
export function loadMemories(): Memory[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveMemories(memories: Memory[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories.slice(-100))); // Keep last 100
  } catch (e) {
    console.error('[Ghost] Failed to save memories:', e);
  }
}

export function addMemory(
  content: string,
  type: MemoryType = 'observation',
  tags: string[] = [],
  importance: number = 5
): Memory {
  const memory: Memory = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    content,
    timestamp: Date.now(),
    tags,
    importance: Math.min(10, Math.max(1, importance)),
  };
  
  const memories = loadMemories();
  memories.push(memory);
  saveMemories(memories);
  return memory;
}

export function getRecentMemories(limit = 20, type?: MemoryType): Memory[] {
  const memories = loadMemories();
  const filtered = type ? memories.filter(m => m.type === type) : memories;
  return filtered
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function searchMemories(query: string): Memory[] {
  const memories = loadMemories();
  const lower = query.toLowerCase();
  return memories.filter(m => 
    m.content.toLowerCase().includes(lower) ||
    m.tags.some(t => t.toLowerCase().includes(lower))
  );
}

// Goal Management
export function loadGoals(): Goal[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(GOALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function saveGoals(goals: Goal[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  } catch (e) {
    console.error('[Ghost] Failed to save goals:', e);
  }
}

export function addGoal(description: string, priority: number = 5): Goal {
  const goal: Goal = {
    id: `goal-${Date.now()}`,
    description,
    status: 'active',
    priority: Math.min(10, Math.max(1, priority)),
    createdAt: Date.now(),
  };
  
  const goals = loadGoals();
  goals.push(goal);
  saveGoals(goals);
  return goal;
}

export function completeGoal(goalId: string) {
  const goals = loadGoals();
  const goal = goals.find(g => g.id === goalId);
  if (goal) {
    goal.status = 'completed';
    goal.completedAt = Date.now();
    saveGoals(goals);
    addMemory(`Completed goal: ${goal.description}`, 'action', ['goal', 'completed'], 7);
  }
}

export function deleteGoal(goalId: string) {
  const goals = loadGoals();
  const filtered = goals.filter(g => g.id !== goalId);
  saveGoals(filtered);
}

// Agent Action Types
export type AgentAction = 
  | { type: 'analyze'; target: string }
  | { type: 'monitor'; source: string }
  | { type: 'alert'; message: string; severity: 'info' | 'warning' | 'critical' }
  | { type: 'correlate'; sources: string[] }
  | { type: 'query'; question: string };

// Agent Brain - Process data and generate actions
export async function processAgentCycle(
  data: {
    polymarket: any[];
    whales: any[];
    yields: any[];
    aircraft: any[];
    satellites: any[];
    earthquakes: any[];
  }
): Promise<AgentAction[]> {
  const actions: AgentAction[] = [];
  const goals = loadGoals().filter(g => g.status === 'active');
  
  // Check for high-priority signals
  const highValueWhales = data.whales.filter((w: any) => 
    parseFloat(w.value.replace(/[^0-9.]/g, '')) > 20
  );
  
  if (highValueWhales.length > 0) {
    actions.push({
      type: 'alert',
      message: `Major whale movement detected: ${highValueWhales[0].value} ${highValueWhales[0].token}`,
      severity: 'warning',
    });
    addMemory(
      `Detected major whale transaction: ${highValueWhales[0].value} ${highValueWhales[0].token}`,
      'observation',
      ['whale', 'alert'],
      8
    );
  }

  // Check geopolitical markets
  const elevatedMarkets = data.polymarket.filter((p: any) => 
    p.category === 'Geopolitics' && p.yesPrice > 0.25
  );
  
  if (elevatedMarkets.length > 0) {
    actions.push({
      type: 'alert',
      message: `Geopolitical tension indicator: ${elevatedMarkets[0].title} (${Math.round(elevatedMarkets[0].yesPrice * 100)}% probability)`,
      severity: 'info',
    });
  }

  // Check yield anomalies
  const anomalyYields = data.yields.filter((y: any) => y.apy > 50);
  if (anomalyYields.length > 0) {
    actions.push({
      type: 'alert',
      message: `Suspicious yield detected: ${anomalyYields[0].symbol} at ${anomalyYields[0].apy.toFixed(1)}% APY`,
      severity: 'warning',
    });
  }

  // Goal-driven actions
  for (const goal of goals) {
    const goalLower = goal.description.toLowerCase();
    
    if (goalLower.includes('whale') || goalLower.includes('smart money')) {
      actions.push({
        type: 'monitor',
        source: 'whale_transactions',
      });
    }
    
    if (goalLower.includes('yield') || goalLower.includes('apy')) {
      actions.push({
        type: 'analyze',
        target: 'yield_opportunities',
      });
    }
    
    if (goalLower.includes('geopolitic') || goalLower.includes('conflict')) {
      actions.push({
        type: 'monitor',
        source: 'prediction_markets',
      });
    }
  }

  // Default: Correlate all sources
  actions.push({
    type: 'correlate',
    sources: ['polymarket', 'whales', 'aircraft', 'seismic'],
  });

  return actions;
}

// Get Groq API key from env or localStorage (Settings)
function getGroqApiKey(): string | null {
  // First check env var
  if (process.env.NEXT_PUBLIC_GROQ_API_KEY) {
    return process.env.NEXT_PUBLIC_GROQ_API_KEY;
  }
  // Then check localStorage (saved from Settings)
  if (typeof window !== 'undefined') {
    const savedKey = localStorage.getItem('ai_api_key_raw');
    const savedProvider = localStorage.getItem('ai_provider');
    // Use key if provider is grok (Groq) or if key starts with gsk_
    if (savedKey && (savedProvider === 'grok' || savedKey.startsWith('gsk_'))) {
      return savedKey;
    }
  }
  return null;
}

// Manual Query Processing
export async function processManualQuery(
  query: string,
  context: {
    signals: any[];
    memories: Memory[];
    goals: Goal[];
  }
): Promise<string> {
  const apiKey = getGroqApiKey();
  
  if (!apiKey) {
    // Fallback without API
    return generateLocalResponse(query, context);
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are Ghost Protocol, an autonomous intelligence system monitoring global financial and geopolitical data. 
            
Current active signals: ${context.signals.length}
Active goals: ${context.goals.map(g => g.description).join(', ')}

Respond concisely in a tactical, intelligence-briefing style. Use military/operations terminology. Focus on actionable insights.`
          },
          {
            role: 'user',
            content: query,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Analysis complete. No immediate concerns.';
  } catch (error) {
    console.error('[Ghost] Query error:', error);
    return generateLocalResponse(query, context);
  }
}

// Local response generator (fallback)
function generateLocalResponse(query: string, context: any): string {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('whale')) {
    return `WHALE ACTIVITY ANALYSIS:\nDetected ${context.signals.filter((s: any) => s.source === 'whale').length} whale-related signals.\nRecommendation: Monitor support levels for potential accumulation zones.`;
  }
  
  if (queryLower.includes('geopolitic') || queryLower.includes('conflict')) {
    return `GEOPOLITICAL ASSESSMENT:\n${context.signals.filter((s: any) => s.source === 'polymarket').length} prediction market signals active.\nRecommendation: Maintain hedged positioning until clarity emerges.`;
  }
  
  if (queryLower.includes('yield') || queryLower.includes('apy')) {
    return `YIELD OPPORTUNITY SCAN:\nCurrent high-APY opportunities identified.\nCaution: Verify contract audits before capital deployment.`;
  }
  
  return `GHOST PROTOCOL STATUS:\nMonitoring ${context.signals.length} active signals across all sources.\nSystems nominal. Awaiting further directives.`;
}

// Initialize agent state
export function initializeAgent(): AgentState {
  return {
    isRunning: false,
    lastCheck: null,
    interval: 0,
    goals: loadGoals(),
    memories: loadMemories(),
    currentTask: null,
  };
}

// Clear all agent data
export function purgeAgentMemory() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(GOALS_KEY);
}
