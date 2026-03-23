import type { MagiAnalysis } from '../../lib/intelligence/magi';

interface MAGINodeProps {
  analysis: MagiAnalysis;
}

export function MAGINode({ analysis }: MAGINodeProps) {
  const getNodeStyles = () => {
    switch (analysis.verdict) {
      case 'APPROVED':
        return 'active';
      case 'REJECTED':
        return 'alert';
      case 'PROCESSING':
        return 'processing';
      default:
        return '';
    }
  };

  const getVerdictColor = () => {
    switch (analysis.verdict) {
      case 'APPROVED':
        return 'var(--data-green)';
      case 'REJECTED':
        return 'var(--alert-red)';
      case 'PROCESSING':
        return 'var(--wire-cyan)';
      default:
        return 'var(--nerv-orange)';
    }
  };

  return (
    <div className={`magi-node ${getNodeStyles()}`}>
      <div className="magi-node-title">{analysis.node}</div>
      <div className="magi-node-role">{analysis.role}</div>
      <div 
        className="magi-node-verdict"
        style={{ color: getVerdictColor() }}
      >
        {analysis.verdict}
      </div>
      <div style={{ 
        marginTop: '8px', 
        fontSize: '10px', 
        fontFamily: 'var(--font-mono)',
        color: 'var(--data-green)',
        opacity: 0.8 
      }}>
        {analysis.data.primaryMetric}
      </div>
      <div style={{
        marginTop: '4px',
        fontSize: '9px',
        fontFamily: 'var(--font-mono)',
        color: 'var(--steel-dim)'
      }}>
        CONFIDENCE: {analysis.confidence.toFixed(0)}%
      </div>
    </div>
  );
}
