import { ExternalLink } from 'lucide-react';

interface Trial {
  id: string;
  title: string;
  status: string;
  phase?: string;
  conditions?: string[];
  interventions?: string[];
}

interface ClinicalTrialCardProps {
  trial: Trial;
}

export function ClinicalTrialCard({ trial }: ClinicalTrialCardProps) {
  const getStatusColor = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes('recruiting')) return 'text-green-400 border-green-400/30 bg-green-400/10';
    if (s.includes('completed') || s.includes('approved')) return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    if (s.includes('suspended') || s.includes('terminated') || s.includes('withdrawn')) return 'text-red-400 border-red-400/30 bg-red-400/10';
    if (s.includes('active') || s.includes('ongoing')) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
    return 'text-nerv-rust border-nerv-brown/50 bg-nerv-void';
  };

  const getStatusDot = (status: string): string => {
    const s = status.toLowerCase();
    if (s.includes('recruiting')) return 'bg-green-400';
    if (s.includes('completed')) return 'bg-blue-400';
    if (s.includes('suspended') || s.includes('terminated')) return 'bg-red-400';
    if (s.includes('active') || s.includes('ongoing')) return 'bg-yellow-400';
    return 'bg-nerv-rust';
  };

  return (
    <div className="border border-nerv-brown/30 p-2.5 hover:border-nerv-orange/30 transition-colors bg-nerv-void/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] text-nerv-amber font-medium line-clamp-2 leading-snug">
            {trial.title}
          </h4>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 text-[9px] border ${getStatusColor(trial.status)}`}>
              <span className={`w-1 h-1 rounded-full ${getStatusDot(trial.status)}`} />
              {trial.status}
            </span>

            {/* Phase Badge */}
            {trial.phase && trial.phase !== 'N/A' && (
              <span className="text-[9px] text-nerv-rust font-mono border border-nerv-brown/50 px-1.5 py-0.5">
                {trial.phase}
              </span>
            )}
          </div>

          {/* Conditions */}
          {trial.conditions && trial.conditions.length > 0 && (
            <p className="text-[9px] text-nerv-rust mt-2 line-clamp-1">
              <span className="text-nerv-orange/70">Conditions:</span>{' '}
              {trial.conditions.slice(0, 3).join(', ')}
              {trial.conditions.length > 3 && ` +${trial.conditions.length - 3} more`}
            </p>
          )}

          {/* Interventions */}
          {trial.interventions && trial.interventions.length > 0 && (
            <p className="text-[9px] text-nerv-rust mt-1 line-clamp-1">
              <span className="text-nerv-orange/70">Interventions:</span>{' '}
              {trial.interventions.slice(0, 2).join(', ')}
              {trial.interventions.length > 2 && ` +${trial.interventions.length - 2} more`}
            </p>
          )}
        </div>

        <a
          href={`https://clinicaltrials.gov/study/${trial.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-nerv-rust hover:text-nerv-orange transition-colors p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
