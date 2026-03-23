/**
 * Usage Example: GlobeTooltip Integration
 * 
 * This shows how to wire the GlobeTooltip to your existing 3D globe
 */

import { useState, useCallback } from 'react';
import { GlobeTooltip, type GlobeEntity } from './GlobeTooltip';

// Example: Adding to your existing WarRoom or GeopoliticalGlobe component

export function GlobeWithTooltips() {
  const [hoveredEntity, setHoveredEntity] = useState<GlobeEntity | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Track mouse position for tooltip placement
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  }, []);

  // Center globe on entity when 'C' is pressed
  const handleCenterOnEntity = useCallback((lat: number, lng: number) => {
    // Your existing globe centering logic
    console.log('Centering on:', lat, lng);
    // globeRef.current?.centerOnCoordinates(lat, lng);
  }, []);

  // Example: Converting your existing data to GlobeEntity format
  const handleAircraftHover = (aircraft: any) => {
    const entity: GlobeEntity = {
      type: 'aircraft',
      id: aircraft.icao24,
      callsign: aircraft.callsign?.trim() || 'UNKNOWN',
      lat: aircraft.latitude,
      lng: aircraft.longitude,
      altitude: aircraft.altitude || 0,
      speed: aircraft.velocity || 0,
      heading: aircraft.true_track || 0,
      military: aircraft.callsign?.startsWith('RCH') || aircraft.callsign?.startsWith('CNV'),
      timestamp: Date.now(),
    };
    setHoveredEntity(entity);
  };

  const handleSatelliteHover = (satellite: any) => {
    const entity: GlobeEntity = {
      type: 'satellite',
      id: satellite.noradId,
      name: satellite.name,
      lat: satellite.lat,
      lng: satellite.lng,
      noradId: satellite.noradId,
      orbitType: satellite.orbitType || 'LEO',
      launchYear: satellite.launchYear || 2020,
      satType: satellite.type || 'commercial',
      timestamp: Date.now(),
    };
    setHoveredEntity(entity);
  };

  const handleEarthquakeHover = (earthquake: any) => {
    const entity: GlobeEntity = {
      type: 'earthquake',
      id: earthquake.id,
      lat: earthquake.lat,
      lng: earthquake.lng,
      magnitude: earthquake.magnitude,
      depth: earthquake.depth,
      location: earthquake.location,
      tsunamiRisk: earthquake.magnitude > 7 && earthquake.depth < 70,
      timestamp: earthquake.time,
    };
    setHoveredEntity(entity);
  };

  const handleSignalHover = (signal: any) => {
    const entity: GlobeEntity = {
      type: 'signal',
      id: signal.id,
      title: signal.title,
      lat: signal.lat || 0,
      lng: signal.lng || 0,
      confidence: signal.confidence || 75,
      description: signal.description,
      correlatedSignals: signal.correlations || [],
      signalType: signal.type || 'macro',
      timestamp: Date.now(),
    };
    setHoveredEntity(entity);
  };

  return (
    <div 
      className="relative w-full h-full"
      onMouseMove={handleMouseMove}
    >
      {/* Your existing globe component */}
      {/* 
      <GeopoliticalGlobe
        onAircraftHover={handleAircraftHover}
        onSatelliteHover={handleSatelliteHover}
        onEarthquakeHover={handleEarthquakeHover}
        onSignalHover={handleSignalHover}
        onEntityLeave={() => setHoveredEntity(null)}
      />
      */}

      {/* The Tooltip */}
      <GlobeTooltip
        entity={hoveredEntity}
        mousePosition={mousePosition}
        screenSize={screenSize}
        onCenter={handleCenterOnEntity}
      />
    </div>
  );
}

// Integration with your existing GeopoliticalGlobe component:
/*

1. In your GeopoliticalGlobe.tsx, add hover event handlers:

const handleMarkerHover = (entity: any, type: string) => {
  if (onEntityHover) {
    onEntityHover(convertToGlobeEntity(entity, type));
  }
};

2. When creating markers, add onPointerEnter:

<mesh
  onPointerEnter={() => handleMarkerHover(data, 'aircraft')}
  onPointerLeave={() => onEntityLeave?.()}
>
  ...marker geometry
</mesh>

3. In your parent component (WarRoom.tsx):

import { GlobeTooltip, type GlobeEntity } from './GlobeTooltip';

const [hoveredEntity, setHoveredEntity] = useState<GlobeEntity | null>(null);
const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

<GlobeTooltip
  entity={hoveredEntity}
  mousePosition={mousePos}
  screenSize={{ width: window.innerWidth, height: window.innerHeight }}
  onCenter={(lat, lng) => globeRef.current?.lookAt(lat, lng)}
/>

*/
