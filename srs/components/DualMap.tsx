import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Map as MapIcon, Hexagon } from 'lucide-react';
import { GeopoliticalGlobe, type GeopoliticalGlobeHandle } from './GeopoliticalGlobe';
import { HexHeatmapGlobe } from './HexHeatmapGlobe';
import type { HexHeatmapGlobeHandle } from '../types/globe';
import { AircraftLayer } from './AircraftLayer';
import { SatelliteLayer } from './SatelliteLayer';
import { EarthquakeLayer } from './EarthquakeLayer';
import type { Aircraft, Satellite, Earthquake } from '../lib/apis';

interface DualMapProps {
  mode: '3d' | 'flat';
  onModeChange: (mode: '3d' | 'flat') => void;
  layers: {
    aircraft: boolean;
    satellites: boolean;
    earthquakes: boolean;
  };
  aircraft: Aircraft[];
  satellites: Satellite[];
  earthquakes: Earthquake[];
  globeRef?: React.RefObject<GeopoliticalGlobeHandle | null>;
  hexGlobeRef?: React.RefObject<HexHeatmapGlobeHandle | null>;
  globeVariant?: 'standard' | 'hex';
  onGlobeVariantChange?: (variant: 'standard' | 'hex') => void;
}

// Flat map component using Canvas
function FlatMap({ 
  aircraft, 
  satellites, 
  earthquakes, 
  layers 
}: { 
  aircraft: Aircraft[]; 
  satellites: Satellite[]; 
  earthquakes: Earthquake[];
  layers: { aircraft: boolean; satellites: boolean; earthquakes: boolean };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Project lat/lon to canvas x/y (Mercator projection)
  const project = useCallback((lat: number, lon: number, width: number, height: number) => {
    const x = (lon + 180) / 360 * width;
    const latRad = lat * Math.PI / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = (1 - (mercN / Math.PI + 1) / 2) * height;
    return { x, y };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    const animate = () => {
      time += 0.016;
      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      // Draw grid
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 12; i++) {
        const x = (i / 12) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let i = 0; i <= 6; i++) {
        const y = (i / 6) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw continents (simplified)
      ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
      // North America
      drawRoughContinent(ctx, [
        { lon: -125, lat: 50 }, { lon: -120, lat: 30 },
        { lon: -80, lat: 25 }, { lon: -60, lat: 45 },
        { lon: -80, lat: 60 }, { lon: -125, lat: 50 }
      ], width, height, project);
      // South America
      drawRoughContinent(ctx, [
        { lon: -80, lat: 10 }, { lon: -60, lat: -10 },
        { lon: -50, lat: -30 }, { lon: -65, lat: -55 },
        { lon: -75, lat: -40 }, { lon: -80, lat: 10 }
      ], width, height, project);
      // Europe
      drawRoughContinent(ctx, [
        { lon: -10, lat: 50 }, { lon: 30, lat: 70 },
        { lon: 40, lat: 60 }, { lon: 30, lat: 35 },
        { lon: 0, lat: 35 }, { lon: -10, lat: 50 }
      ], width, height, project);
      // Africa
      drawRoughContinent(ctx, [
        { lon: -15, lat: 35 }, { lon: 35, lat: 35 },
        { lon: 45, lat: 10 }, { lon: 40, lat: -35 },
        { lon: 15, lat: -35 }, { lon: -10, lat: 10 },
        { lon: -15, lat: 35 }
      ], width, height, project);
      // Asia
      drawRoughContinent(ctx, [
        { lon: 40, lat: 70 }, { lon: 140, lat: 70 },
        { lon: 145, lat: 35 }, { lon: 120, lat: 20 },
        { lon: 80, lat: 5 }, { lon: 40, lat: 20 },
        { lon: 40, lat: 70 }
      ], width, height, project);
      // Australia
      drawRoughContinent(ctx, [
        { lon: 115, lat: -10 }, { lon: 155, lat: -10 },
        { lon: 150, lat: -45 }, { lon: 115, lat: -35 },
        { lon: 115, lat: -10 }
      ], width, height, project);

      // Draw earthquakes
      if (layers.earthquakes) {
        earthquakes.slice(0, 50).forEach((eq) => {
          const pos = project(eq.lat, eq.lon, width, height);
          const size = Math.max(2, Math.min(12, eq.magnitude * 2));
          
          // Pulse effect
          const pulse = Math.sin(time * 3 + eq.magnitude) * 0.3 + 0.7;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size * pulse, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 0, 64, ${0.4 * pulse})`;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = '#ff0040';
          ctx.fill();
        });
      }

      // Draw satellites
      if (layers.satellites) {
        satellites.forEach((sat) => {
          const pos = project(sat.lat, sat.lon, width, height);
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#00bfff';
          ctx.fill();
          
          // Cross
          ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos.x - 5, pos.y);
          ctx.lineTo(pos.x + 5, pos.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - 5);
          ctx.lineTo(pos.x, pos.y + 5);
          ctx.stroke();
        });
      }

      // Draw aircraft
      if (layers.aircraft) {
        aircraft.slice(0, 100).forEach((ac) => {
          const pos = project(ac.lat, ac.lon, width, height);
          ctx.save();
          ctx.translate(pos.x, pos.y);
          ctx.rotate((ac.heading * Math.PI) / 180);
          
          // Triangle
          ctx.beginPath();
          ctx.moveTo(0, -4);
          ctx.lineTo(-3, 4);
          ctx.lineTo(3, 4);
          ctx.closePath();
          ctx.fillStyle = '#ffb800';
          ctx.fill();
          
          ctx.restore();
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [aircraft, satellites, earthquakes, layers, project]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function drawRoughContinent(
  ctx: CanvasRenderingContext2D,
  points: { lon: number; lat: number }[],
  width: number,
  height: number,
  project: (lat: number, lon: number, w: number, h: number) => { x: number; y: number }
) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const pos = project(p.lat, p.lon, width, height);
    if (i === 0) ctx.moveTo(pos.x, pos.y);
    else ctx.lineTo(pos.x, pos.y);
  });
  ctx.closePath();
  ctx.fill();
}

export function DualMap({
  mode,
  onModeChange,
  layers,
  aircraft,
  satellites,
  earthquakes,
  globeRef,
  hexGlobeRef,
  globeVariant = 'hex',
  onGlobeVariantChange,
}: DualMapProps) {
  return (
    <div className="relative h-full w-full">
      {/* Mode Toggle - Center Top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex bg-black/80 backdrop-blur-md border border-zinc-700 rounded-lg overflow-hidden">
        <button
          onClick={() => onModeChange('3d')}
          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono transition-all ${
            mode === '3d'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          3D GLOBE
        </button>
        <button
          onClick={() => onModeChange('flat')}
          className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono transition-all ${
            mode === 'flat'
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          FLAT MAP
        </button>
      </div>

      {/* Globe Variant Toggle - Only show in 3D mode */}
      {mode === '3d' && onGlobeVariantChange && (
        <div className="absolute top-4 right-4 z-50 flex bg-black/80 backdrop-blur-md border border-zinc-700 rounded-lg overflow-hidden">
          <button
            onClick={() => onGlobeVariantChange('standard')}
            className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono transition-all ${
              globeVariant === 'standard'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Standard
          </button>
          <button
            onClick={() => onGlobeVariantChange('hex')}
            className={`flex items-center gap-2 px-3 py-2 text-[11px] font-mono transition-all ${
              globeVariant === 'hex'
                ? 'bg-nerv-orange/20 text-nerv-orange'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Hexagon className="w-3.5 h-3.5" />
            HEX
          </button>
        </div>
      )}

      {/* Map Content */}
      <div className="absolute inset-0">
        {mode === '3d' ? (
          globeVariant === 'hex' ? (
            <HexHeatmapGlobe ref={hexGlobeRef} />
          ) : (
            <>
              <GeopoliticalGlobe ref={globeRef} />
              <div className="absolute inset-0 pointer-events-none">
                <AircraftLayer aircraft={aircraft} visible={layers.aircraft} />
                <SatelliteLayer satellites={satellites} visible={layers.satellites} />
                <EarthquakeLayer earthquakes={earthquakes} visible={layers.earthquakes} />
              </div>
            </>
          )
        ) : (
          <FlatMap
            aircraft={aircraft}
            satellites={satellites}
            earthquakes={earthquakes}
            layers={layers}
          />
        )}
      </div>
    </div>
  );
}
