import { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// --- Configuration ---
const GLOBE_RADIUS = 2;
const MARKER_COUNT = 1000; // Start with 1000 for performance

// --- GLSL Shaders ---
const globeVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const globeFragmentShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform vec3 uColor;
  
  void main() {
    // Scanline effect
    float scan = sin(vPosition.y * 10.0 - uTime * 2.0);
    float alpha = 0.1 + 0.2 * step(0.8, scan);
    
    // Fresnel rim lighting
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.0);
    
    vec3 finalColor = uColor * (0.2 + fresnel * 0.8 + alpha);
    gl_FragColor = vec4(finalColor, 0.6);
  }
`;

// --- Types ---
export interface MarkerData {
  id: string;
  lat: number;
  lon: number;
  type: 'conflict' | 'economic' | 'satellite' | 'vessel' | 'seismic';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

// --- Helper: Generate evenly spaced markers ---
function generateDemoMarkers(count: number = MARKER_COUNT): MarkerData[] {
  const markers: MarkerData[] = [];
  const types: MarkerData['type'][] = ['conflict', 'economic', 'satellite', 'vessel', 'seismic'];
  
  // Fibonacci sphere algorithm for even distribution
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y
    const theta = phi * i; // golden angle increment
    
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    
    // Convert to lat/lon
    const lat = Math.asin(y) * (180 / Math.PI);
    const lon = Math.atan2(z, x) * (180 / Math.PI);
    
    markers.push({
      id: `marker-${i}`,
      lat,
      lon,
      type: types[i % types.length],
      severity: ['low', 'medium', 'high', 'critical'][i % 4] as any
    });
  }
  
  return markers;
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

// --- Components ---

function NERVGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const markersRef = useRef<THREE.InstancedMesh>(null);
  const { clock } = useThree();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const [markers] = useState(() => generateDemoMarkers(MARKER_COUNT));

  // Initialize marker positions
  useEffect(() => {
    if (!markersRef.current) return;

    markers.forEach((point, i) => {
      if (i >= MARKER_COUNT) return;
      
      const pos = latLonToVector3(point.lat, point.lon, GLOBE_RADIUS + 0.02);

      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      
      markersRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Color coding - NO CYAN: conflict=red, economic=amber, default=orange
      const color = new THREE.Color(
        point.type === 'conflict' ? '#FF2A2A' :
        point.type === 'economic' ? '#FFB800' :
        '#FF9830'
      );
      markersRef.current!.setColorAt(i, color);
    });
    
    markersRef.current.instanceMatrix.needsUpdate = true;
    if (markersRef.current.instanceColor) {
      markersRef.current.instanceColor.needsUpdate = true;
    }
  }, [markers, dummy]);

  // Animation loop
  useFrame(() => {
    if (meshRef.current) {
      // Slow idle rotation
      meshRef.current.rotation.y += 0.0005;
      
      // Update shader time uniform
      const material = meshRef.current.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.uTime) {
        material.uniforms.uTime.value = clock.getElapsedTime();
      }
    }
  });

  // Shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: globeVertexShader,
      fragmentShader: globeFragmentShader,
      transparent: true,
      wireframe: true,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#FF9830') } // NERV Orange
      }
    });
  }, []);

  return (
    <group>
      {/* Wireframe Globe with Shader */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[GLOBE_RADIUS, 1]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>

      {/* Solid Core */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS - 0.1, 32, 32]} />
        <meshBasicMaterial color="#0C0C0A" />
      </mesh>

      {/* Instanced Markers */}
      <instancedMesh 
        ref={markersRef} 
        args={[undefined, undefined, MARKER_COUNT]}
      >
        <circleGeometry args={[0.03, 8]} />
        <meshBasicMaterial transparent opacity={0.8} side={THREE.DoubleSide} />
      </instancedMesh>
      
      {/* Atmosphere Glow */}
      <mesh scale={[1.1, 1.1, 1.1]}>
        <sphereGeometry args={[GLOBE_RADIUS, 32, 32]} />
        <meshBasicMaterial 
          color="#FF9830" 
          transparent 
          opacity={0.05} 
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Simple starfield component
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
      <pointsMaterial size={0.1} color="#888888" transparent opacity={0.8} />
    </points>
  );
}

// Simple orbit controls implementation
function SimpleOrbitControls() {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);

  useEffect(() => {
    const canvas = gl.domElement;
    
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      
      rotation.current.y += deltaX * 0.005;
      rotation.current.x += deltaY * 0.005;
      rotation.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.current.x));
      
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      setTimeout(() => { autoRotate.current = true; }, 2000);
    };
    
    const handleWheel = (e: WheelEvent) => {
      const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
      const newDistance = Math.max(3, Math.min(10, distance + e.deltaY * 0.01));
      camera.position.setLength(newDistance);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [camera, gl]);

  useFrame(() => {
    if (autoRotate.current) {
      rotation.current.y += 0.0005;
    }
    
    const distance = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    camera.position.x = distance * Math.sin(rotation.current.y) * Math.cos(rotation.current.x);
    camera.position.y = distance * Math.sin(rotation.current.x);
    camera.position.z = distance * Math.cos(rotation.current.y) * Math.cos(rotation.current.x);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// --- Main Export ---
export function WarRoomGlobe() {
  return (
    <div className="w-full h-full">
      <Canvas 
        frameloop="demand"
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['#0C0C0A']} />
        <Starfield />
        <ambientLight intensity={0.5} />
        <NERVGlobe />
        <SimpleOrbitControls />
      </Canvas>
    </div>
  );
}
