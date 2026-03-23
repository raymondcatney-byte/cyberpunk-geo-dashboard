import type { MagiConsensus } from '../../lib/intelligence/magi';
import { MAGINode } from './MAGINode';
import { getConsensusSummary, getConsensusColor } from '../../lib/intelligence/magi';

interface MAGIPanelProps {
  consensus: MagiConsensus;
  title?: string;
}

export function MAGIPanel({ consensus, title = 'MAGI CONSENSUS' }: MAGIPanelProps) {
  return (
    <div className="nerv-panel" style={{ padding: '16px' }}>
      <div className="nerv-title" style={{ marginBottom: '16px' }}>
        {title}
      </div>
      
      {/* Consensus Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        padding: '8px 12px',
        background: 'rgba(255, 152, 48, 0.1)',
        border: '1px solid var(--nerv-orange)'
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: getConsensusColor(consensus.consensus),
          fontWeight: 700,
          letterSpacing: '0.05em'
        }}>
          {getConsensusSummary(consensus)}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--steel-dim)'
        }}>
          {new Date(consensus.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {/* MAGI Nodes */}
      <div className="magi-consensus">
        <MAGINode analysis={consensus.melchior} />
        <MAGINode analysis={consensus.balthasar} />
        <MAGINode analysis={consensus.casper} />
      </div>

      {/* Detailed Reasoning */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        border: '1px solid rgba(80, 255, 80, 0.2)',
        background: 'rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          color: 'var(--nerv-orange)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '8px'
        }}>
          Analysis Summary
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--data-green)',
          lineHeight: '1.6'
        }}>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--nerv-orange)' }}>MELCHIOR-1:</span> {consensus.melchior.data.reasoning}
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--nerv-orange)' }}>BALTHASAR-2:</span> {consensus.balthasar.data.reasoning}
          </div>
          <div>
            <span style={{ color: 'var(--nerv-orange)' }}>CASPER-3:</span> {consensus.casper.data.reasoning}
          </div>
        </div>
      </div>
    </div>
  );
}
