import { X, Clock, CheckCircle, AlertTriangle, BookOpen, Target, Lightbulb } from 'lucide-react';
import { Protocol } from '../config/persona';

interface ProtocolDetailProps {
  protocol: Protocol;
  onClose: () => void;
  onToggleStatus: () => void;
}

export function ProtocolDetail({ protocol, onClose, onToggleStatus }: ProtocolDetailProps) {
  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] border-l border-[#262626]">
      {/* Header */}
      <div className="p-4 border-b border-[#262626] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-amber-500 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">Protocol Details</h2>
            <p className="text-[10px] text-[#737373]">Strategic optimization guide</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-[#525252] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Protocol Title & Status */}
        <div className="p-4 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-lg font-medium text-white">{protocol.title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span className="text-[12px] text-amber-400 font-mono">{protocol.time}</span>
              </div>
            </div>
            <button
              onClick={onToggleStatus}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-[11px] transition-all ${
                protocol.status === 'completed'
                  ? 'bg-green-500/20 border-green-500/50 text-green-400'
                  : 'bg-[#0a0a0a] border-[#262626] text-[#737373] hover:border-blue-500/30'
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              {protocol.status === 'completed' ? 'Completed' : 'Mark Complete'}
            </button>
          </div>
          <p className="text-[13px] text-[#a3a3a3]">{protocol.description}</p>
        </div>

        {/* Rationale */}
        <div className="p-4 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h4 className="text-[12px] text-white font-medium">The Rationale</h4>
          </div>
          <p className="text-[12px] text-[#a3a3a3] leading-relaxed">
            {protocol.details.rationale}
          </p>
        </div>

        {/* Benefits */}
        <div className="p-4 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-green-400" />
            <h4 className="text-[12px] text-white font-medium">Expected Benefits</h4>
          </div>
          <ul className="space-y-2">
            {protocol.details.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5" />
                <span className="text-[12px] text-[#a3a3a3]">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Methodology */}
        <div className="p-4 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h4 className="text-[12px] text-white font-medium">Methodology</h4>
          </div>
          <p className="text-[12px] text-[#a3a3a3] leading-relaxed">
            {protocol.details.methodology}
          </p>
        </div>

        {/* Timing */}
        <div className="p-4 bg-[#171717] rounded border border-[#262626]">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-purple-400" />
            <h4 className="text-[12px] text-white font-medium">Optimal Timing</h4>
          </div>
          <p className="text-[12px] text-[#a3a3a3] leading-relaxed">
            {protocol.details.timing}
          </p>
        </div>

        {/* Contraindications */}
        <div className="p-4 bg-amber-500/5 rounded border border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h4 className="text-[12px] text-amber-400 font-medium">Contraindications & Cautions</h4>
          </div>
          <p className="text-[12px] text-[#a3a3a3] leading-relaxed">
            {protocol.details.contraindications}
          </p>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-[#262626]">
        <button
          onClick={onToggleStatus}
          className={`w-full py-3 rounded border text-[12px] font-medium transition-all ${
            protocol.status === 'completed'
              ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
              : 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
          }`}
        >
          {protocol.status === 'completed' ? 'Protocol Completed' : 'Mark as Completed'}
        </button>
      </div>
    </div>
  );
}
