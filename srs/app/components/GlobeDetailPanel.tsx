import { X, Wifi, WifiOff, AlertTriangle, Plane, Activity } from 'lucide-react';
import type { AircraftState } from '../lib/flightTracking';

type IntelligenceDomain = 'markets' | 'crypto' | 'geopolitics' | 'biotech' | 'ai' | 'robotics';
type IntelligenceSeverity = 'critical' | 'high' | 'medium' | 'low';

interface IntelligenceEvent {
  id: string;
  domain: IntelligenceDomain;
  severity: IntelligenceSeverity;
  title: string;
  timestamp: string;
  source: string;
  url?: string;
  lat?: number;
  lng?: number;
  countryCode?: string;
  metadata?: Record<string, unknown>;
}

interface GlobeDetailPanelProps {
  event?: IntelligenceEvent | null;
  aircraft?: AircraftState | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GlobeDetailPanel({ event, aircraft, isOpen, onClose }: GlobeDetailPanelProps) {
  if (!isOpen || (!event && !aircraft)) return null;

  const isEvent = !!event;
  const data = event || aircraft;

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-black/95 border-l border-[#ff9f1c]/30 backdrop-blur-sm z-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#ff9f1c]/30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2ec4b6] animate-pulse" />
          <span className="text-[#ff9f1c] font-mono text-sm tracking-wider">
            {isEvent ? 'INTELLIGENCE.DOT' : 'AIRCRAFT.TRACK'}
          </span>
        </div>
        <button 
          onClick={onClose}
          className="text-[#adb5bd] hover:text-[#ff9f1c] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
        {isEvent && event ? (
          <EventDetail event={event} />
        ) : aircraft ? (
          <AircraftDetail aircraft={aircraft} />
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#ff9f1c]/30 text-[10px] text-[#adb5bd] flex justify-between">
        <span>PROTOCOL: HTTP/1.1</span>
        <span>ENC: TLS1.3</span>
      </div>
    </div>
  );
}

function EventDetail({ event }: { event: IntelligenceEvent }) {
  const severityColor = {
    critical: 'text-[#d62828]',
    high: 'text-[#ff9f1c]',
    medium: 'text-[#2ec4b6]',
    low: 'text-[#adb5bd]',
  }[event.severity];

  return (
    <div className="space-y-4">
      {/* Status Block */}
      <div className="border border-[#ff9f1c]/30 p-3 rounded bg-[#ff9f1c]/5">
        <div className="text-[10px] text-[#adb5bd] mb-1">SEVERITY</div>
        <div className={`text-lg font-bold ${severityColor} uppercase`}>
          {event.severity}
        </div>
        <div className="text-[10px] text-[#adb5bd] mt-2">DOMAIN</div>
        <div className="text-[#ff9f1c] uppercase">{event.domain}</div>
      </div>

      {/* Title */}
      <div>
        <div className="text-[10px] text-[#adb5bd] mb-1">EVENT.TITLE</div>
        <div className="text-white leading-relaxed">{event.title}</div>
      </div>

      {/* Metadata */}
      <div className="border border-[#ff9f1c]/20 p-3 rounded">
        <div className="text-[10px] text-[#adb5bd] mb-1">TIMESTAMP</div>
        <div className="text-[#ff9f1c] text-xs">
          {new Date(event.timestamp).toLocaleString()}
        </div>
        
        <div className="text-[10px] text-[#adb5bd] mt-3 mb-1">SOURCE</div>
        <div className="text-[#ff9f1c] text-xs">{event.source}</div>
        
        {event.lat && event.lng && (
          <>
            <div className="text-[10px] text-[#adb5bd] mt-3 mb-1">COORDINATES</div>
            <div className="text-[#2ec4b6] text-xs font-mono">
              {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
            </div>
          </>
        )}
        
        {event.countryCode && (
          <>
            <div className="text-[10px] text-[#adb5bd] mt-3 mb-1">REGION</div>
            <div className="text-[#ff9f1c] text-xs">{event.countryCode}</div>
          </>
        )}
      </div>

      {/* Warning block for critical/high */}
      {(event.severity === 'critical' || event.severity === 'high') && (
        <div className="border border-[#d62828] bg-[#d62828]/10 p-3 rounded">
          <div className="flex items-center gap-2 text-[#d62828] text-xs mb-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-bold">ELEVATED THREAT</span>
          </div>
          <div className="text-[#adb5bd] text-xs">
            This event requires immediate attention per MAGI threat assessment protocols.
          </div>
        </div>
      )}

      {/* Japanese accent */}
      <div className="text-[#adb5bd]/30 text-[10px] text-right">
        警報: 脅威検出
      </div>
    </div>
  );
}

function AircraftDetail({ aircraft }: { aircraft: AircraftState }) {
  return (
    <div className="space-y-4">
      {/* Status Block */}
      <div className="border border-[#ff9f1c]/30 p-3 rounded bg-[#ff9f1c]/5">
        <div className="flex items-center gap-2 mb-2">
          <Plane className="w-4 h-4 text-[#ff9f1c]" />
          <span className="text-[#ff9f1c] font-bold">
            {aircraft.callsign?.trim() || 'UNKNOWN'}
          </span>
        </div>
        <div className="text-[10px] text-[#adb5bd]">
          ICAO: {aircraft.icao24.toUpperCase()}
        </div>
      </div>

      {/* Flight Data */}
      <div className="border border-[#ff9f1c]/20 p-3 rounded">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-[#adb5bd] mb-1">ALTITUDE</div>
            <div className="text-[#ff9f1c] text-lg">
              {Math.round(aircraft.altitude * 3.281).toLocaleString()}
              <span className="text-xs ml-1">ft</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#adb5bd] mb-1">SPEED</div>
            <div className="text-[#ff9f1c] text-lg">
              {Math.round(aircraft.velocity * 1.944)}
              <span className="text-xs ml-1">kts</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#adb5bd] mb-1">HEADING</div>
            <div className="text-[#2ec4b6] text-lg">
              {Math.round(aircraft.heading)}°
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#adb5bd] mb-1">VERTICAL</div>
            <div className={`text-lg ${aircraft.vertical_rate > 0 ? 'text-[#2ec4b6]' : aircraft.vertical_rate < 0 ? 'text-[#d62828]' : 'text-[#adb5bd]'}`}>
              {aircraft.vertical_rate > 0 ? '↗' : aircraft.vertical_rate < 0 ? '↘' : '—'}
              <span className="text-xs ml-1">
                {Math.abs(Math.round(aircraft.vertical_rate * 196.85))} fpm
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="border border-[#ff9f1c]/20 p-3 rounded">
        <div className="text-[10px] text-[#adb5bd] mb-1">POSITION</div>
        <div className="text-[#2ec4b6] text-xs font-mono">
          {aircraft.latitude.toFixed(4)}, {aircraft.longitude.toFixed(4)}
        </div>
        
        {aircraft.origin_country && (
          <>
            <div className="text-[10px] text-[#adb5bd] mt-3 mb-1">ORIGIN</div>
            <div className="text-[#ff9f1c] text-xs">{aircraft.origin_country}</div>
          </>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${aircraft.on_ground ? 'bg-[#d62828]' : 'bg-[#2ec4b6] animate-pulse'}`} />
        <span className="text-[10px] text-[#adb5bd]">
          {aircraft.on_ground ? 'ON GROUND' : 'IN FLIGHT'}
        </span>
      </div>

      {/* Japanese accent */}
      <div className="text-[#adb5bd]/30 text-[10px] text-right">
        航空機追跡中
      </div>
    </div>
  );
}
