import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Compass,
  Activity,
  Satellite,
  AlertTriangle,
  Zap,
  Copy,
  Check,
  Crosshair,
  TrendingUp,
  Plane,
  Radio,
  Waves,
  MapPin,
  Clock,
  Target
} from 'lucide-react';

// Entity Types
export interface AircraftEntity {
  type: 'aircraft';
  id: string;
  callsign: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  military: boolean;
  timestamp: number;
}

export interface SatelliteEntity {
  type: 'satellite';
  id: string;
  name: string;
  lat: number;
  lng: number;
  noradId: string;
  orbitType: 'LEO' | 'GEO' | 'MEO' | 'HEO';
  launchYear: number;
  satType: 'iss' | 'starlink' | 'military' | 'weather' | 'commercial';
  timestamp: number;
}

export interface EarthquakeEntity {
  type: 'earthquake';
  id: string;
  lat: number;
  lng: number;
  magnitude: number;
  depth: number;
  location: string;
  tsunamiRisk: boolean;
  timestamp: number;
}

export interface SignalEntity {
  type: 'signal';
  id: string;
  title: string;
  lat: number;
  lng: number;
  confidence: number;
  description: string;
  correlatedSignals: string[];
  signalType: 'polymarket' | 'whale' | 'yield' | 'macro';
  timestamp: number;
}

export type GlobeEntity = AircraftEntity | SatelliteEntity | EarthquakeEntity | SignalEntity;

interface GlobeTooltipProps {
  entity: GlobeEntity | null;
  mousePosition: { x: number; y: number };
  screenSize: { width: number; height: number };
  onCenter?: (lat: number, lng: number) => void;
}

// Sentinel color palette
const SENTINEL_AMBER = '#FFB800';
const SENTINEL_AMBER_DIM = '#B8860B';
const SENTINEL_CYAN = '#00B4D8';

export function GlobeTooltip({ entity, mousePosition, screenSize, onCenter }: GlobeTooltipProps) {
  const [copied, setCopied] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Calculate tooltip position to avoid going off-screen
  useEffect(() => {
    if (!entity) return;

    const tooltipWidth = 320;
    const tooltipHeight = 200;
    const padding = 20;

    let x = mousePosition.x + padding;
    let y = mousePosition.y + padding;

    // Flip to left if on right half of screen
    if (mousePosition.x > screenSize.width / 2) {
      x = mousePosition.x - tooltipWidth - padding;
    }

    // Adjust Y if going off bottom
    if (y + tooltipHeight > screenSize.height) {
      y = screenSize.height - tooltipHeight - padding;
    }

    // Adjust Y if going off top
    if (y < padding) {
      y = padding;
    }

    setPosition({ x, y });
  }, [entity, mousePosition, screenSize]);

  // Keyboard shortcut to center ('C' key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') {
        if (entity && onCenter) {
          onCenter(entity.lat, entity.lng);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entity, onCenter]);

  const copyCoordinates = () => {
    if (!entity) return;
    navigator.clipboard.writeText(`${entity.lat.toFixed(4)}, ${entity.lng.toFixed(4)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!entity) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          zIndex: 100,
        }}
        className="w-80 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#FFB800]/40 rounded-lg overflow-hidden"
      >
        {/* Header - Live Indicator with Amber Background */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#FFB800] border-b border-[#FFB800]/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
            <span className="text-[10px] text-black font-mono uppercase tracking-wider font-bold">
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-black/70 font-mono">
              updated {getTimeAgo(entity.timestamp)}
            </span>
            <button
              onClick={copyCoordinates}
              className="p-1 hover:bg-black/20 rounded transition-colors group"
              title="Copy coordinates (C to center)"
            >
              {copied ? (
                <Check className="w-3 h-3 text-black" />
              ) : (
                <Copy className="w-3 h-3 text-black/60 group-hover:text-black" />
              )}
            </button>
          </div>
        </div>

        {/* Content based on entity type */}
        <div className="p-3">
          {entity.type === 'aircraft' && <AircraftContent aircraft={entity} />}
          {entity.type === 'satellite' && <SatelliteContent satellite={entity} />}
          {entity.type === 'earthquake' && <EarthquakeContent earthquake={entity} />}
          {entity.type === 'signal' && <SignalContent signal={entity} />}
        </div>

        {/* Footer - Coordinates */}
        <div className="px-3 py-2 bg-black/50 border-t border-[#FFB800]/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-[#B8860B] font-mono">
            <MapPin className="w-3 h-3" />
            <span>{entity.lat.toFixed(4)}, {entity.lng.toFixed(4)}</span>
          </div>
          <span className="text-[9px] text-[#B8860B]/70 font-mono">Press C to center</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Aircraft Content Layout
function AircraftContent({ aircraft }: { aircraft: AircraftEntity }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-[#FFB800]" />
          <span className="text-sm font-mono font-bold text-white">{aircraft.callsign}</span>
        </div>
        {aircraft.military && (
          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-mono uppercase rounded">
            Military
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
          <div className="flex items-center gap-1 text-[10px] text-[#B8860B] mb-1">
            <Activity className="w-3 h-3" />
            ALTITUDE
          </div>
          <div className="text-sm font-mono text-[#FFB800]">{aircraft.altitude.toLocaleString()} ft</div>
        </div>

        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
          <div className="flex items-center gap-1 text-[10px] text-[#B8860B] mb-1">
            <Zap className="w-3 h-3" />
            SPEED
          </div>
          <div className="text-sm font-mono text-[#FFB800]">{aircraft.speed} kts</div>
        </div>

        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20 col-span-2">
          <div className="flex items-center gap-1 text-[10px] text-[#B8860B] mb-1">
            <Compass className="w-3 h-3" />
            HEADING
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-mono text-[#FFB800]">{aircraft.heading}°</div>
            <CompassIndicator heading={aircraft.heading} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Compass visual indicator
function CompassIndicator({ heading }: { heading: number }) {
  return (
    <div className="relative w-6 h-6 rounded-full border border-[#FFB800]/30 bg-[#FFB800]/10">
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: `rotate(${heading}deg)` }}
      >
        <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#FFB800]" />
      </div>
    </div>
  );
}

// Satellite Content Layout
function SatelliteContent({ satellite }: { satellite: SatelliteEntity }) {
  const accentColor =
    satellite.satType === 'iss' ? 'text-orange-400' :
    satellite.satType === 'starlink' ? 'text-[#00B4D8]' :
    satellite.satType === 'military' ? 'text-red-400' :
    'text-[#FFB800]';

  const borderColor =
    satellite.satType === 'iss' ? 'border-orange-500/30' :
    satellite.satType === 'starlink' ? 'border-[#00B4D8]/30' :
    satellite.satType === 'military' ? 'border-red-500/30' :
    'border-[#FFB800]/30';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Satellite className={`w-4 h-4 ${accentColor}`} />
          <span className={`text-sm font-mono font-bold ${accentColor}`}>{satellite.name}</span>
        </div>
        <span className={`px-2 py-0.5 bg-black/50 border ${borderColor} text-[9px] font-mono uppercase rounded text-[#FFB800]`}>
          {satellite.orbitType}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
          <div className="text-[10px] text-[#B8860B] mb-1">NORAD ID</div>
          <div className="text-sm font-mono text-[#FFB800]">{satellite.noradId}</div>
        </div>

        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
          <div className="text-[10px] text-[#B8860B] mb-1">LAUNCHED</div>
          <div className="text-sm font-mono text-[#FFB800]">{satellite.launchYear}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#B8860B]">Type:</span>
        <span className={`text-[10px] font-mono uppercase ${accentColor}`}>
          {satellite.satType}
        </span>
      </div>
    </div>
  );
}

// Earthquake Content Layout
function EarthquakeContent({ earthquake }: { earthquake: EarthquakeEntity }) {
  const magnitudeColor =
    earthquake.magnitude >= 7 ? 'text-red-400' :
    earthquake.magnitude >= 5 ? 'text-orange-400' :
    'text-[#FFB800]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 ${magnitudeColor}`} />
          <span className={`text-lg font-mono font-bold ${magnitudeColor}`}>
            M{earthquake.magnitude.toFixed(1)}
          </span>
        </div>
        {earthquake.tsunamiRisk && (
          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 text-red-400 text-[9px] font-mono uppercase rounded flex items-center gap-1">
            <Waves className="w-3 h-3" />
            Tsunami Risk
          </span>
        )}
      </div>

      <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
        <div className="text-[10px] text-[#B8860B] mb-1">LOCATION</div>
        <div className="text-sm font-mono text-[#FFB800]">{earthquake.location}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
          <div className="text-[10px] text-[#B8860B] mb-1">DEPTH</div>
          <div className="text-sm font-mono text-[#FFB800]">{earthquake.depth} km</div>
        </div>

        <div className="bg-black/40 rounded p-2 border border-[#FFB800]/20">
          <div className="text-[10px] text-[#B8860B] mb-1">SEVERITY</div>
          <div className={`text-sm font-mono ${magnitudeColor}`}>
            {earthquake.magnitude >= 7 ? 'MAJOR' :
             earthquake.magnitude >= 5 ? 'MODERATE' :
             'MINOR'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Signal Content Layout
function SignalContent({ signal }: { signal: SignalEntity }) {
  const confidenceColor =
    signal.confidence >= 80 ? 'text-[#FFB800]' :
    signal.confidence >= 50 ? 'text-[#B8860B]' :
    'text-red-400';

  const signalIcon =
    signal.signalType === 'polymarket' ? <TrendingUp className="w-4 h-4" /> :
    signal.signalType === 'whale' ? <Radio className="w-4 h-4" /> :
    <Target className="w-4 h-4" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-[#FFB800]">{signalIcon}</span>
        <span className="text-sm font-mono font-bold text-white line-clamp-1">{signal.title}</span>
      </div>

      <div className="flex items-center justify-between bg-black/40 rounded p-3 border border-[#FFB800]/20">
        <span className="text-[10px] text-[#B8860B] uppercase">Confidence</span>
        <span className={`text-2xl font-mono font-bold ${confidenceColor}`}>
          {signal.confidence}%
        </span>
      </div>

      <p className="text-xs text-[#B8860B]/80 font-mono leading-relaxed">
        {signal.description}
      </p>

      {signal.correlatedSignals.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {signal.correlatedSignals.map((corr, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-[#FFB800]/10 border border-[#FFB800]/30 text-[#FFB800] text-[9px] font-mono rounded"
            >
              {corr}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
