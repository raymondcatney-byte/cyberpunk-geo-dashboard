import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Earthquake } from '../lib/apis';

interface EarthquakeLayerProps {
  earthquakes: Earthquake[];
  globeRadius?: number;
  visible?: boolean;
}

// Red color for earthquakes
const QUAKE_COLOR = 0xFF0040;
const QUAKE_GLOW = 0xFF2040;
const ALERT_COLORS: Record<string, number> = {
  green: 0x00FF40,
  yellow: 0xFFFF00,
  orange: 0xFF8000,
  red: 0xFF0040,
};

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function EarthquakeLayer({ earthquakes, globeRadius = 6, visible = true }: EarthquakeLayerProps) {
  const markersRef = useRef<THREE.Object3D[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) {
      markersRef.current.forEach(m => m.visible = false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const globe = document.querySelector('[data-globe]') as any;
    if (!globe || !globe.__globeGroup) return;

    // Clean up
    markersRef.current.forEach(m => {
      if (m.parent) m.parent.remove(m);
    });
    markersRef.current = [];

    const radius = globeRadius + 0.1;

    earthquakes.forEach((eq) => {
      // Size based on magnitude
      const size = Math.max(0.05, Math.min(0.3, (eq.magnitude - 2) * 0.05));
      const color = eq.alert ? ALERT_COLORS[eq.alert] : QUAKE_COLOR;
      
      const pos = latLonToVector3(eq.lat, eq.lon, radius);
      
      const group = new THREE.Group();
      group.position.copy(pos);

      // Center dot
      const dotGeo = new THREE.SphereGeometry(size, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      group.add(dot);

      // Pulse ring (will animate)
      const ringGeo = new THREE.RingGeometry(size * 1.5, size * 1.8, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      group.add(ring);

      // Outer glow
      const glowGeo = new THREE.SphereGeometry(size * 2, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: QUAKE_GLOW,
        transparent: true,
        opacity: 0.15,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      group.userData = { 
        type: 'earthquake', 
        earthquake: eq,
        id: eq.id,
        ring,
        baseScale: 1,
        phase: Math.random() * Math.PI * 2
      };

      globe.__globeGroup.add(group);
      markersRef.current.push(group);
    });

    // Animate pulses
    const animate = (time: number) => {
      markersRef.current.forEach((m) => {
        const ring = m.userData.ring as THREE.Mesh;
        if (ring) {
          const t = (time / 1000) + m.userData.phase;
          const scale = 1 + Math.sin(t * 2) * 0.3;
          ring.scale.setScalar(scale);
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.4 - (scale - 1) * 0.5;
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      markersRef.current.forEach(m => {
        if (m.parent) m.parent.remove(m);
      });
      markersRef.current = [];
    };
  }, [earthquakes, globeRadius, visible]);

  return null;
}
