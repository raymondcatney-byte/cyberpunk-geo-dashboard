import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface Paper {
  pmid: string;
  title: string;
  authorString?: string;
  journalTitle?: string;
  pubYear?: string;
  abstractText?: string;
}

interface ResearchPaperCardProps {
  paper: Paper;
}

export function ResearchPaperCard({ paper }: ResearchPaperCardProps) {
  const [expanded, setExpanded] = useState(false);

  const authors = paper.authorString?.split(', ').slice(0, 3).join(', ') || 'Unknown';
  const hasMoreAuthors = paper.authorString?.split(', ').length > 3;

  return (
    <div className="border border-nerv-brown/30 p-2.5 hover:border-nerv-orange/30 transition-colors bg-nerv-void/50">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] text-nerv-amber font-medium line-clamp-2 leading-snug">
            {paper.title}
          </h4>
          <p className="text-[9px] text-nerv-rust mt-1.5 font-mono">
            {authors}{hasMoreAuthors ? ' et al.' : ''}
          </p>
          <p className="text-[9px] text-nerv-rust/70 font-mono">
            {paper.journalTitle || 'Unknown Journal'} • {paper.pubYear || 'N/A'}
          </p>
        </div>
        <a
          href={`https://pubmed.ncbi.nlm.nih.gov/${paper.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-nerv-rust hover:text-nerv-orange transition-colors p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {paper.abstractText && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[9px] text-nerv-orange hover:text-nerv-amber transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Show abstract</span>
            </>
          )}
        </button>
      )}

      {expanded && paper.abstractText && (
        <div className="mt-2 pt-2 border-t border-nerv-brown/20 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[10px] text-nerv-rust leading-relaxed">
            {paper.abstractText.slice(0, 400)}
            {paper.abstractText.length > 400 && '...'}
          </p>
        </div>
      )}
    </div>
  );
}
