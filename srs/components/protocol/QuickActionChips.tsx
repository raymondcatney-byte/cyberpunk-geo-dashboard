/**
 * Quick Action Chips
 * Renders below ProtocolsPromptBar for one-click biomarker queries
 * Does NOT modify ProtocolsPromptBar - completely separate component
 */

import { Moon, Activity, Plane, Heart, Zap } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  query: string;
  description: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'slept-poorly',
    label: 'Slept poorly',
    icon: <Moon className="w-3 h-3" />,
    query: 'Sleep <6h, low REM, groggy. Adjust fasting, caffeine, training intensity.',
    description: 'Sleep deprivation protocol adjustments',
  },
  {
    id: 'feeling-sore',
    label: 'Feeling sore',
    icon: <Activity className="w-3 h-3" />,
    query: 'Inflamed, sore, fatigued. Recovery protocol, reduce intensity, curcumin.',
    description: 'Inflammation and recovery focus',
  },
  {
    id: 'traveling',
    label: 'Traveling',
    icon: <Plane className="w-3 h-3" />,
    query: 'Jet lag, time zone shift, travel stress. Melatonin, meal timing, NAD+.',
    description: 'Jet lag and travel protocols',
  },
  {
    id: 'low-hrv',
    label: 'Low HRV',
    icon: <Heart className="w-3 h-3" />,
    query: 'HRV <50, readiness low, parasympathetic down. Recovery, no sauna, glycine.',
    description: 'Low HRV recovery adjustments',
  },
  {
    id: 'high-stakes',
    label: 'High stakes day',
    icon: <Zap className="w-3 h-3" />,
    query: 'Presentation, negotiation, critical meeting. Tyrosine, cold plunge, nootropics.',
    description: 'Performance optimization for critical days',
  },
];

interface QuickActionChipsProps {
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export function QuickActionChips({ onSelect, disabled }: QuickActionChipsProps) {
  return (
    <div className="px-4 py-2 bg-[#0a0a0a] border-b border-[#262626]">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-[#525252] uppercase tracking-wider mr-1">
          Quick context:
        </span>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onSelect(action.query)}
            disabled={disabled}
            title={action.description}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] 
                       bg-[#171717] border border-[#262626] text-[#a3a3a3]
                       hover:border-nerv-orange hover:text-nerv-orange
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
