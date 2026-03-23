import { TrendingUp, TrendingDown, Minus, Activity, Zap, Flame, Brain, AlertTriangle } from 'lucide-react';
import type { Opportunity } from '../../hooks/usePolymarketOpportunities';

interface SidebarProps {
  opportunities: Opportunity[];
}

export function Sidebar({ opportunities }: SidebarProps) {
  // Calculate stats
  const total = opportunities.length;
  const active = opportunities.filter(o => o.market.volume > 0).length;
  const anomalies = opportunities.filter(o => o.anomalies.length > 0).length;

  // Anomaly breakdown
  const volumeSpikes = opportunities.filter(o => o.anomalies.includes('volume_spike')).length;
  const priceSwings = opportunities.filter(o => o.anomalies.includes('price_swing')).length;
  const smartMoney = opportunities.filter(o => o.anomalies.includes('smart_money')).length;
  const liquidity = opportunities.filter(o => o.anomalies.includes('liquidity')).length;

  // Category distribution
  const byCategory: Record<string, number> = {};
  opportunities.forEach(o => {
    byCategory[o.market.category] = (byCategory[o.market.category] || 0) + 1;
  });

  const maxCount = Math.max(...Object.values(byCategory), 1);

  // Signal counts
  const strongBuy = opportunities.filter(o => o.compositeScore >= 80).length;
  const buy = opportunities.filter(o => o.compositeScore >= 60 && o.compositeScore < 80).length;
  const hold = opportunities.filter(o => o.compositeScore >= 40 && o.compositeScore < 60).length;
  const sell = opportunities.filter(o => o.compositeScore >= 20 && o.compositeScore < 40).length;
  const strongSell = opportunities.filter(o => o.compositeScore < 20).length;

  return (
    <div className="w-[280px] border-r border-nerv-brown bg-nerv-void-panel overflow-y-auto">
      {/* Stats Panel */}
      <div className="p-4 border-b border-nerv-brown">
        <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
          MARKETS
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-nerv-rust font-mono">Total</span>
            <span className="text-nerv-amber font-mono">{total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-nerv-rust font-mono">Active</span>
            <span className="text-nerv-amber font-mono">{active}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-nerv-rust font-mono">Anomalies</span>
            <span className="text-nerv-alert font-mono">{anomalies}</span>
          </div>
        </div>
      </div>

      {/* Anomaly Breakdown */}
      <div className="p-4 border-b border-nerv-brown">
        <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
          ANOMALY BREAKDOWN
        </h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-nerv-orange" />
            <span className="text-nerv-rust text-xs font-mono flex-1">Volume Spike</span>
            <span className="text-nerv-amber text-xs font-mono">{volumeSpikes}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-nerv-alert" />
            <span className="text-nerv-rust text-xs font-mono flex-1">Price Swing</span>
            <span className="text-nerv-amber text-xs font-mono">{priceSwings}</span>
          </div>
          <div className="flex items-center gap-2">
            <Brain className="w-3 h-3 text-nerv-amber" />
            <span className="text-nerv-rust text-xs font-mono flex-1">Smart Money</span>
            <span className="text-nerv-amber text-xs font-mono">{smartMoney}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-green-400" />
            <span className="text-nerv-rust text-xs font-mono flex-1">Liquidity</span>
            <span className="text-nerv-amber text-xs font-mono">{liquidity}</span>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="p-4 border-b border-nerv-brown">
        <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
          CATEGORIES
        </h3>
        <div className="space-y-2">
          {Object.entries(byCategory).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-2">
              <span className="text-nerv-rust text-xs font-mono w-20 truncate">{cat}</span>
              <div className="flex-1 h-2 bg-nerv-void rounded-sm overflow-hidden">
                <div
                  className="h-full bg-nerv-orange"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-nerv-amber text-xs font-mono w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signal Summary */}
      <div className="p-4">
        <h3 className="text-[10px] text-nerv-rust font-mono uppercase tracking-wider mb-3">
          SIGNALS
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-green-400" />
            <span className="text-nerv-rust text-xs font-mono flex-1">STRONG BUY</span>
            <span className="text-green-400 text-xs font-mono">{strongBuy}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-green-300" />
            <span className="text-nerv-rust text-xs font-mono flex-1">BUY</span>
            <span className="text-green-300 text-xs font-mono">{buy}</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="w-3 h-3 text-nerv-rust" />
            <span className="text-nerv-rust text-xs font-mono flex-1">HOLD</span>
            <span className="text-nerv-rust text-xs font-mono">{hold}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3 h-3 text-red-300" />
            <span className="text-nerv-rust text-xs font-mono flex-1">SELL</span>
            <span className="text-red-300 text-xs font-mono">{sell}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-nerv-rust text-xs font-mono flex-1">STRONG SELL</span>
            <span className="text-red-400 text-xs font-mono">{strongSell}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
