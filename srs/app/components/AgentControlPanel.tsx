import { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Square, 
  Clock, 
  Brain, 
  Target, 
  Trash2, 
  Plus, 
  CheckCircle2, 
  Circle,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Terminal,
  Activity
} from 'lucide-react';
import { 
  AgentState, 
  initializeAgent, 
  addGoal, 
  completeGoal, 
  deleteGoal,
  loadGoals,
  getRecentMemories,
  processManualQuery,
  purgeAgentMemory,
  type Goal,
  type Memory
} from '../lib/agent-core';

interface AgentControlPanelProps {
  signals: any[];
  onRunCycle?: () => void;
}

export function AgentControlPanel({ signals, onRunCycle }: AgentControlPanelProps) {
  const [agent, setAgent] = useState<AgentState>(initializeAgent);
  const [isExpanded, setIsExpanded] = useState(true);
  const [newGoal, setNewGoal] = useState('');
  const [query, setQuery] = useState('');
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Refresh agent state
  const refreshState = useCallback(() => {
    setAgent({
      ...agent,
      goals: loadGoals(),
      memories: getRecentMemories(10),
    });
  }, [agent]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(refreshState, 5000);
    return () => clearInterval(interval);
  }, [refreshState]);

  // Toggle autonomous mode
  const toggleAutonomous = (minutes: number) => {
    setAgent(prev => ({
      ...prev,
      isRunning: minutes > 0 && prev.interval !== minutes,
      interval: minutes,
      lastCheck: minutes > 0 ? Date.now() : prev.lastCheck,
    }));
    setLastAction(`Autonomous mode set to ${minutes > 0 ? `${minutes} min` : 'OFF'}`);
  };

  // Add new goal
  const handleAddGoal = () => {
    if (!newGoal.trim()) return;
    addGoal(newGoal.trim());
    setNewGoal('');
    refreshState();
    setLastAction(`New objective added: ${newGoal}`);
  };

  // Complete goal
  const handleComplete = (id: string) => {
    completeGoal(id);
    refreshState();
    setLastAction('Objective completed');
  };

  // Delete goal
  const handleDelete = (id: string) => {
    deleteGoal(id);
    refreshState();
    setLastAction('Objective removed');
  };

  // Run manual query
  const handleQuery = async () => {
    if (!query.trim() || isProcessing) return;
    setIsProcessing(true);
    setQueryResult(null);

    const result = await processManualQuery(query, {
      signals,
      memories: agent.memories,
      goals: agent.goals,
    });

    setQueryResult(result);
    setLastAction(`Query processed: "${query.slice(0, 30)}..."`);
    setIsProcessing(false);
    refreshState();
  };

  // Purge memory
  const handlePurge = () => {
    if (confirm('Purge all agent memory and goals?')) {
      purgeAgentMemory();
      refreshState();
      setLastAction('Memory purged');
    }
  };

  const activeGoals = agent.goals.filter(g => g.status === 'active');
  const completedGoals = agent.goals.filter(g => g.status === 'completed');

  return (
    <div className="nerv-panel border border-[var(--hazard)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-[var(--hazard)]/10 hover:bg-[var(--hazard)]/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-4 h-4 text-[var(--hazard)]" />
          <span className="nerv-label text-[var(--hazard)]">GHOST PROTOCOL CONTROL</span>
          <div className={`w-2 h-2 rounded-full ${agent.isRunning ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--steel)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--steel)]" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Status Line */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-4">
              <span className="text-[var(--steel)]">
                STATUS: <span className={agent.isRunning ? 'text-green-400' : 'text-zinc-500'}>
                  {agent.isRunning ? 'AUTONOMOUS' : 'STANDBY'}
                </span>
              </span>
              {agent.lastCheck && (
                <span className="text-[var(--steel)]">
                  LAST CHECK: {new Date(agent.lastCheck).toLocaleTimeString()}
                </span>
              )}
            </div>
            <span className="text-[var(--steel)]">
              SIGNALS: <span className="text-[var(--hazard)]">{signals.length}</span>
            </span>
          </div>

          {/* Autonomous Mode Controls */}
          <div className="space-y-2">
            <div className="text-[10px] text-[var(--steel)] uppercase tracking-wider">Autonomous Mode</div>
            <div className="flex gap-2">
              {[5, 15, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => toggleAutonomous(min)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-all ${
                    agent.interval === min && agent.isRunning
                      ? 'bg-green-500/20 border-green-500/40 text-green-400'
                      : 'bg-black/40 border-[var(--grid)] text-[var(--steel)] hover:border-[var(--hazard)]'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  {min}m
                </button>
              ))}
              <button
                onClick={() => toggleAutonomous(0)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-all ${
                  !agent.isRunning
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : 'bg-black/40 border-[var(--grid)] text-[var(--steel)] hover:border-red-500'
                }`}
              >
                <Square className="w-3 h-3" />
                OFF
              </button>
            </div>
          </div>

          {/* Manual Query */}
          <div className="space-y-2">
            <div className="text-[10px] text-[var(--steel)] uppercase tracking-wider">Direct Query</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
                placeholder="Enter tactical query..."
                className="flex-1 bg-black/60 border border-[var(--grid)] px-3 py-2 text-xs text-[var(--terminal)] placeholder-zinc-600 focus:border-[var(--hazard)] focus:outline-none font-mono"
              />
              <button
                onClick={handleQuery}
                disabled={isProcessing || !query.trim()}
                className="px-4 py-2 bg-[var(--hazard)]/20 border border-[var(--hazard)]/40 text-[var(--hazard)] text-xs hover:bg-[var(--hazard)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <RotateCcw className="w-3 h-3 animate-spin" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                RUN
              </button>
            </div>
            {queryResult && (
              <div className="p-3 bg-black/60 border border-[var(--grid)] text-xs text-[var(--terminal)] font-mono whitespace-pre-wrap">
                {queryResult}
              </div>
            )}
          </div>

          {/* Goals Section */}
          <div className="space-y-2">
            <div className="text-[10px] text-[var(--steel)] uppercase tracking-wider flex items-center gap-2">
              <Target className="w-3 h-3" />
              Active Objectives ({activeGoals.length})
            </div>
            
            {/* Add Goal */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                placeholder="Define new objective..."
                className="flex-1 bg-black/60 border border-[var(--grid)] px-3 py-2 text-xs text-[var(--terminal)] placeholder-zinc-600 focus:border-[var(--hazard)] focus:outline-none"
              />
              <button
                onClick={handleAddGoal}
                disabled={!newGoal.trim()}
                className="px-3 py-2 bg-[var(--hazard)]/20 border border-[var(--hazard)]/40 text-[var(--hazard)] hover:bg-[var(--hazard)]/30 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Goals List */}
            <div className="space-y-1 max-h-[120px] overflow-y-auto scrollbar-thin">
              {activeGoals.map((goal) => (
                <GoalItem 
                  key={goal.id} 
                  goal={goal} 
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              ))}
              {activeGoals.length === 0 && (
                <div className="text-xs text-zinc-600 italic p-2">No active objectives</div>
              )}
            </div>
          </div>

          {/* Last Action */}
          {lastAction && (
            <div className="flex items-center gap-2 text-xs text-[var(--steel)] border-t border-[var(--grid)] pt-3">
              <Activity className="w-3 h-3 text-[var(--hazard)]" />
              <span>LAST ACTION: {lastAction}</span>
            </div>
          )}

          {/* Memory Browser Toggle */}
          <button
            onClick={() => setShowMemory(!showMemory)}
            className="w-full flex items-center justify-between p-2 text-xs border border-[var(--grid)] hover:border-[var(--hazard)] transition-colors"
          >
            <span className="text-[var(--steel)] flex items-center gap-2">
              <Brain className="w-3 h-3" />
              Memory Browser ({agent.memories.length} entries)
            </span>
            {showMemory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Memory Browser */}
          {showMemory && (
            <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin border border-[var(--grid)] p-2 bg-black/40">
              {getRecentMemories(20).map((mem) => (
                <MemoryItem key={mem.id} memory={mem} />
              ))}
              {agent.memories.length === 0 && (
                <div className="text-xs text-zinc-600 italic">No memory entries</div>
              )}
              <button
                onClick={handlePurge}
                className="w-full flex items-center justify-center gap-2 p-2 text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors mt-2"
              >
                <Trash2 className="w-3 h-3" />
                PURGE MEMORY
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Goal Item Component
function GoalItem({ 
  goal, 
  onComplete, 
  onDelete 
}: { 
  goal: Goal; 
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-black/40 border border-[var(--grid)] hover:border-[var(--hazard)]/50 transition-colors group">
      <button
        onClick={() => onComplete(goal.id)}
        className="text-zinc-600 hover:text-green-400 transition-colors"
      >
        <Circle className="w-4 h-4" />
      </button>
      <span className="flex-1 text-xs text-[var(--terminal)] truncate">
        {goal.description}
      </span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-zinc-600">P{goal.priority}</span>
        <button
          onClick={() => onDelete(goal.id)}
          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// Memory Item Component
function MemoryItem({ memory }: { memory: Memory }) {
  const typeColors = {
    observation: 'text-blue-400',
    action: 'text-green-400',
    insight: 'text-amber-400',
    goal: 'text-purple-400',
  };

  return (
    <div className="p-2 text-xs border-l-2 border-[var(--grid)] hover:border-[var(--hazard)] bg-black/20">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] uppercase ${typeColors[memory.type] || 'text-zinc-500'}`}>
          {memory.type}
        </span>
        <span className="text-[10px] text-zinc-600">
          {new Date(memory.timestamp).toLocaleTimeString()}
        </span>
        {memory.importance >= 7 && (
          <AlertTriangle className="w-3 h-3 text-amber-400" />
        )}
      </div>
      <div className="text-zinc-400">{memory.content}</div>
      {memory.tags.length > 0 && (
        <div className="flex gap-1 mt-1">
          {memory.tags.map(tag => (
            <span key={tag} className="text-[9px] px-1 bg-zinc-800 text-zinc-500 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
