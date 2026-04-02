/**
 * Research Results Component
 * Displays biotech research results with PubMed citations
 */

import { useState } from 'react';
import { 
  ExternalLink, 
  BookOpen, 
  AlertTriangle, 
  CheckCircle, 
  Beaker,
  TrendingUp,
  Shield,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import type { ResearchResult, PubMedArticle } from '../../lib/biotechResearch';
import { checkInteraction, getContraindications, type Interaction } from '../../config/supplementInteractions';

interface ResearchResultsProps {
  result: ResearchResult;
  interactionCheck?: {
    supplement1: string;
    supplement2: string;
  } | null;
}

export function ResearchResults({ result, interactionCheck }: ResearchResultsProps) {
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);
  
  const getConfidenceColor = (confidence: ResearchResult['confidence']) => {
    switch (confidence) {
      case 'high': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'low': return 'text-orange-400';
      case 'insufficient': return 'text-red-400';
    }
  };
  
  const getConfidenceBg = (confidence: ResearchResult['confidence']) => {
    switch (confidence) {
      case 'high': return 'bg-green-400/10 border-green-400/30';
      case 'moderate': return 'bg-yellow-400/10 border-yellow-400/30';
      case 'low': return 'bg-orange-400/10 border-orange-400/30';
      case 'insufficient': return 'bg-red-400/10 border-red-400/30';
    }
  };
  
  const getEvidenceLabel = (level: ResearchResult['evidenceLevel']) => {
    switch (level) {
      case 'systematic_review': return 'Systematic Review';
      case 'rct': return 'Clinical Trial';
      case 'cohort': return 'Cohort Study';
      case 'observational': return 'Observational';
      case 'preclinical': return 'Preclinical';
      case 'unknown': return 'Unknown';
    }
  };
  
  // Check for interactions if two supplements provided
  let interaction: Interaction | null = null;
  if (interactionCheck) {
    interaction = checkInteraction(interactionCheck.supplement1, interactionCheck.supplement2);
  }
  
  return (
    <div className="space-y-3 text-[12px]">
      {/* Header with confidence badge */}
      <div className={`p-3 rounded border ${getConfidenceBg(result.confidence)}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Beaker className="w-4 h-4 text-nerv-orange" />
            <span className="font-medium text-white">Research Analysis</span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider ${getConfidenceColor(result.confidence)}`}>
            {result.confidence} Confidence
          </span>
        </div>
        <p className="text-[#a3a3a3] leading-relaxed">{result.summary}</p>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-nerv-rust">
          <BookOpen className="w-3 h-3" />
          <span>{result.articles.length} PubMed articles</span>
          <span className="mx-1">•</span>
          <span>{getEvidenceLabel(result.evidenceLevel)}</span>
        </div>
      </div>
      
      {/* Interaction Warning */}
      {interaction && (
        <div className={`p-3 rounded border ${
          interaction.severity === 'critical' ? 'bg-red-500/10 border-red-500/50' :
          interaction.severity === 'high' ? 'bg-orange-500/10 border-orange-500/50' :
          'bg-yellow-500/10 border-yellow-500/50'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className={`w-4 h-4 ${
              interaction.severity === 'critical' ? 'text-red-400' :
              interaction.severity === 'high' ? 'text-orange-400' :
              'text-yellow-400'
            }`} />
            <span className="font-medium text-white capitalize">
              {interaction.severity} Interaction
            </span>
          </div>
          <p className="text-[#a3a3a3] mb-2">{interaction.description}</p>
          <div className="text-[10px] text-nerv-rust">
            <span className="text-nerv-orange">Mechanism:</span> {interaction.mechanism}
          </div>
          <div className="mt-2 p-2 bg-black/30 rounded text-[11px] text-nerv-amber">
            <span className="font-medium">Recommendation:</span> {interaction.recommendation}
          </div>
        </div>
      )}
      
      {/* Recommendations */}
      {result.recommendations.length > 0 && (
        <div className="p-3 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="font-medium text-white">Recommendations</span>
          </div>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-[#a3a3a3]">
                <div className="w-1 h-1 rounded-full bg-green-400 mt-1.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Safety Notes */}
      {result.safetyNotes.length > 0 && (
        <div className="p-3 bg-amber-500/5 rounded border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-amber-400">Safety Considerations</span>
          </div>
          <ul className="space-y-1.5">
            {result.safetyNotes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-[#a3a3a3]">
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* PubMed Articles */}
      {result.articles.length > 0 && (
        <div className="p-3 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-white">PubMed References</span>
          </div>
          <div className="space-y-2">
            {result.articles.map((article) => (
              <div 
                key={article.pmid}
                className="p-2 bg-[#0a0a0a] rounded border border-[#262626] cursor-pointer hover:border-nerv-orange/30 transition-colors"
                onClick={() => setExpandedArticle(expandedArticle === article.pmid ? null : article.pmid)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#a3a3a3] line-clamp-2">{article.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-nerv-rust">
                      <span>{article.journal}</span>
                      <span>•</span>
                      <span>{article.year || 'N/A'}</span>
                    </div>
                  </div>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-nerv-rust hover:text-nerv-orange transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                
                {expandedArticle === article.pmid && (
                  <div className="mt-2 pt-2 border-t border-[#262626]">
                    <p className="text-[10px] text-nerv-rust">
                      <span className="text-nerv-orange">PMID:</span> {article.pmid}
                    </p>
                    {article.authors.length > 0 && (
                      <p className="text-[10px] text-nerv-rust mt-1">
                        <span className="text-nerv-orange">Authors:</span> {article.authors.slice(0, 3).join(', ')}
                        {article.authors.length > 3 && ' et al.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="text-[10px] text-nerv-rust text-center">
        Research performed: {new Date(result.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

// Interaction checker component
interface InteractionCheckerProps {
  supplement1: string;
  supplement2: string;
}

export function InteractionCheckerPreview({ supplement1, supplement2 }: InteractionCheckerProps) {
  const interaction = checkInteraction(supplement1, supplement2);
  
  if (!interaction) {
    return (
      <div className="p-2 bg-green-500/10 rounded border border-green-500/30 text-[11px]">
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle className="w-3 h-3" />
          <span>No known interaction</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className={`p-2 rounded border text-[11px] ${
      interaction.severity === 'critical' ? 'bg-red-500/10 border-red-500/50' :
      interaction.severity === 'high' ? 'bg-orange-500/10 border-orange-500/50' :
      'bg-yellow-500/10 border-yellow-500/50'
    }`}>
      <div className={`flex items-center gap-2 ${
        interaction.severity === 'critical' ? 'text-red-400' :
        interaction.severity === 'high' ? 'text-orange-400' :
        'text-yellow-400'
      }`}>
        <AlertTriangle className="w-3 h-3" />
        <span className="capitalize">{interaction.severity} interaction detected</span>
      </div>
      <p className="mt-1 text-[#a3a3a3]">{interaction.description}</p>
    </div>
  );
}
