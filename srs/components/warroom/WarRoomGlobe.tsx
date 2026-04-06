import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { LIVESTREAMS } from '../../config/livestreams';

// --- Configuration ---
const GLOBE_RADIUS = 2;
const NERV_ORANGE = '#FF9900';
const NERV_ALERT_RED = '#FF0000';

// --- Types ---
interface HotspotData {
  id: string;
  lat: number;
  lon: number;
  name: string;
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface WarRoomGlobeProps {
  showLivestreamMarkers?: boolean;
  activeStreamId?: string | null;
  onCitySelect?: (id: string) => void;
}

// --- Helper: Lat/Lon to Vector3 ---
function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// --- Tactical Hotspot Data (Real-ish coordinates) ---
const TACTICAL_HOTSPOTS: HotspotData[] = [
  { id: 'ukr', lat: 49.0, lon: 32.0, name: 'Ukraine', code: 'UKR-CRIT', severity: 'critical' },
  { id: 'pse', lat: 31.5, lon: 34.5, name: 'Palestine', code: 'PSE-CRIT', severity: 'critical' },
  { id: 'twn', lat: 23.5, lon: 121.0, name: 'Taiwan', code: 'TWN-HIGH', severity: 'high' },
  { id: 'irn', lat: 32.0, lon: 53.0, name: 'Iran', code: 'IRN-HIGH', severity: 'high' },
  { id: 'chn', lat: 35.0, lon: 105.0, name: 'China', code: 'CHN-MED', severity: 'medium' },
  { id: 'kor', lat: 36.0, lon: 128.0, name: 'Korea', code: 'KOR-MED', severity: 'medium' },
  { id: 'syr', lat: 35.0, lon: 39.0, name: 'Syria', code: 'SYR-HIGH', severity: 'high' },
  { id: 'sud', lat: 15.0, lon: 30.0, name: 'Sudan', code: 'SUD-CRIT', severity: 'critical' },
];

// --- Tactical Globe Component ---
function TacticalGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const [resyncActive, setResyncActive] = useState(false);
  
  // Re-sync animation every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setResyncActive(true);
      setTimeout(() => setResyncActive(false), 500);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Slow surveillance rotation
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0003; // Slower crawl
    }
  });

  return (
    <group>
      {/* Faceted Low-Poly Wireframe Globe - International Orange */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[GLOBE_RADIUS, 2]} /> {/* Low poly faceting */}
        <meshBasicMaterial 
          color={NERV_ORANGE}
          wireframe={true}
          transparent={true}
          opacity={resyncActive ? 0.4 : 0.15} /* Re-sync flicker */
        />
      </mesh>

      {/* Solid Core - Dark void */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS - 0.05, 16, 16]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
    </group>
  );
}

// --- Lat/Lon Grid Overlay ---
function LatLonGrid() {
  const groupRef = useRef<THREE.Group>(null);
  const radius = GLOBE_RADIUS * 1.02;

  const lines = useMemo(() => {
    const lineArray: JSX.Element[] = [];
    
    // Longitude lines (meridians)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const lonPoints: number[] = [];
      for (let j = 0; j <= 64; j++) {
        const phi = (j / 64) * Math.PI;
        lonPoints.push(
          radius * Math.sin(phi) * Math.cos(angle),
          radius * Math.cos(phi),
          radius * Math.sin(phi) * Math.sin(angle)
        );
      }
      
      lineArray.push(
        <line key={`lon-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={65}
              array={new Float32Array(lonPoints)}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FF9900" transparent opacity={0.3} />
        </line>
      );
    }
    
    // Latitude lines (parallels)
    for (let i = 1; i < 6; i++) {
      const phi = (i / 6) * Math.PI;
      const y = radius * Math.cos(phi);
      const r = radius * Math.sin(phi);
      
      const points: number[] = [];
      for (let j = 0; j <= 64; j++) {
        const theta = (j / 64) * Math.PI * 2;
        points.push(r * Math.cos(theta), y, r * Math.sin(theta));
      }
      
      lineArray.push(
        <line key={`lat-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={65}
              array={new Float32Array(points)}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#FF9900" transparent opacity={0.2} />
        </line>
      );
    }
    
    return lineArray;
  }, []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.0003;
    }
  });

  return <group ref={groupRef}>{lines}</group>;
}

// --- Orbital Rings (Holographic UI) ---
function OrbitalRings() {
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x += 0.002;
      ring1Ref.current.rotation.y += 0.001;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y += 0.003;
      ring2Ref.current.rotation.z += 0.001;
    }
  });

  return (
    <group>
      {/* Inner ring - rotates on Y */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[GLOBE_RADIUS * 1.4, 0.01, 8, 100]} />
        <meshBasicMaterial 
          color="#FF9900" 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Outer ring - rotates on Z */}
      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[GLOBE_RADIUS * 1.8, 0.008, 8, 100]} />
        <meshBasicMaterial 
          color="#FF6600" 
          transparent 
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// --- Tactical Hotspot Markers ---
function TacticalHotspots() {
  const groupRef = useRef<THREE.Group>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  // Pulse animation
  useFrame(({ clock }) => {
    setPulsePhase(clock.getElapsedTime());
  });

  const markers = useMemo(() => {
    return TACTICAL_HOTSPOTS.map((hotspot) => {
      const pos = latLonToVector3(hotspot.lat, hotspot.lon, GLOBE_RADIUS + 0.05);
      const isCritical = hotspot.severity === 'critical';
      const isHigh = hotspot.severity === 'high';
      
      // Pulse between orange and red
      const pulseIntensity = (Math.sin(pulsePhase * 2) + 1) / 2;
      const color = isCritical 
        ? new THREE.Color().lerpColors(
            new THREE.Color(NERV_ORANGE), 
            new THREE.Color(NERV_ALERT_RED), 
            pulseIntensity
          )
        : isHigh
          ? new THREE.Color().lerpColors(
              new THREE.Color(NERV_ORANGE),
              new THREE.Color('#FF4400'),
              pulseIntensity * 0.5
            )
          : new THREE.Color(NERV_ORANGE);
      
      return {
        ...hotspot,
        position: pos,
        color: color,
        scale: isCritical ? 1.2 : 1.0
      };
    });
  }, [pulsePhase]);

  return (
    <group ref={groupRef}>
      {markers.map((marker) => (
        <group key={marker.id} position={marker.position}>
          {/* Diamond marker */}
          <mesh lookAt={[0, 0, 0]} scale={marker.scale}>
            <boxGeometry args={[0.06, 0.06, 0.02]} />
            <meshBasicMaterial 
              color={marker.color} 
              transparent 
              opacity={0.9}
            />
          </mesh>
          
          {/* Leader line to label */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([
                  0, 0, 0,
                  0, 0.3, 0
                ])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#FF9900" transparent opacity={0.5} />
          </line>
          
          {/* Label background */}
          <mesh position={[0, 0.35, 0]}>
            <planeGeometry args={[0.5, 0.12]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// --- HTML Labels for Region Codes ---
function RegionLabels() {
  const { camera } = useThree();
  const [visibleLabels, setVisibleLabels] = useState<Set<string>>(new Set());

  useFrame(() => {
    // Determine which labels are facing camera
    const newVisible = new Set<string>();
    TACTICAL_HOTSPOTS.forEach((hotspot) => {
      const pos = latLonToVector3(hotspot.lat, hotspot.lon, GLOBE_RADIUS + 0.05);
      const direction = pos.clone().sub(camera.position).normalize();
      const dot = pos.normalize().dot(direction);
      if (dot > 0.3) {
        newVisible.add(hotspot.id);
      }
    });
    setVisibleLabels(newVisible);
  });

  return (
    <>
      {TACTICAL_HOTSPOTS.map((hotspot) => {
        const pos = latLonToVector3(hotspot.lat, hotspot.lon, GLOBE_RADIUS + 0.4);
        const isVisible = visibleLabels.has(hotspot.id);
        
        return (
          <Html
            key={hotspot.id}
            position={[pos.x, pos.y + 0.35, pos.z]}
            center
            style={{
              opacity: isVisible ? 1 : 0,
              transition: 'opacity 0.3s',
              pointerEvents: 'none',
            }}
          >
            <div 
              className="text-[10px] font-mono font-bold whitespace-nowrap"
              style={{ 
                color: hotspot.severity === 'critical' ? '#FF0000' : '#FF9900',
                textShadow: '0 0 4px rgba(255, 153, 0, 0.5)'
              }}
            >
              {hotspot.code}
            </div>
          </Html>
        );
      })}
    </>
  );
}

// --- Livestream Markers Component ---
function LivestreamMarkers({ 
  showMarkers, 
  activeStreamId, 
  onCitySelect 
}: { 
  showMarkers: boolean; 
  activeStreamId: string | null; 
  onCitySelect?: (id: string) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const mouse = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    if (!showMarkers || !onCitySelect) return;
    
    const canvas = gl.domElement;
    
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      if (groupRef.current) {
        const intersects = raycaster.intersectObjects(groupRef.current.children);
        if (intersects.length > 0) {
          const streamId = intersects[0].object.userData.streamId;
          if (streamId) onCitySelect(streamId);
        }
      }
    };
    
    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [showMarkers, onCitySelect, camera, gl, raycaster, mouse]);

  if (!showMarkers) return null;

  return (
    <group ref={groupRef}>
      {LIVESTREAMS.map((stream) => {
        const pos = latLonToVector3(stream.lat, stream.lng, GLOBE_RADIUS + 0.05);
        const isActive = activeStreamId === stream.id;
        
        return (
          <group key={stream.id} position={pos}>
            {/* Diamond marker instead of sphere */}
            <mesh userData={{ streamId: stream.id }} lookAt={[0, 0, 0]}>
              <boxGeometry args={[isActive ? 0.08 : 0.05, isActive ? 0.08 : 0.05, 0.02]} />
              <meshBasicMaterial 
                color={isActive ? '#FF9900' : '#CC6600'} 
                transparent 
                opacity={isActive ? 1 : 0.7}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// --- Starfield Background ---
function Starfield() {
  const points = useMemo(() => {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const r = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    
    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.1} color="#444444" transparent opacity={0.6} />
    </points>
  );
}

// --- Auto-rotating Camera ---
function AutoRotateCamera() {
  const { camera } = useThree();
  const rotation = useRef(0);
  
  useFrame(() => {
    rotation.current += 0.0003; // Slower surveillance crawl
    const distance = 6;
    camera.position.x = distance * Math.sin(rotation.current);
    camera.position.z = distance * Math.cos(rotation.current);
    camera.lookAt(0, 0, 0);
  });
  
  return null;
}

// --- Main Export ---
export function WarRoomGlobe({ 
  showLivestreamMarkers = false,
  activeStreamId = null,
  onCitySelect
}: WarRoomGlobeProps) {
  return (
    <div className="w-full h-full">
      <Canvas 
        frameloop="always"
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0C0C0A']} />
        <Starfield />
        <ambientLight intensity={0.3} />
        
        {/* Core Globe */}
        <TacticalGlobe />
        
        {/* Grid Overlay */}
        <LatLonGrid />
        
        {/* Orbital Rings */}
        <OrbitalRings />
        
        {/* Tactical Hotspots */}
        <TacticalHotspots />
        
        {/* Labels */}
        <RegionLabels />
        
        {/* Livestream Markers */}
        <LivestreamMarkers 
          showMarkers={showLivestreamMarkers}
          activeStreamId={activeStreamId}
          onCitySelect={onCitySelect}
        />
        
        {/* Camera */}
        <AutoRotateCamera />
      </Canvas>
    </div>
  );
}
