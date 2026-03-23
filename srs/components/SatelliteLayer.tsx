import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Satellite } from '../lib/apis';

interface SatelliteLayerProps {
  satellites: Satellite[];
  globeRadius?: number;
  visible?: boolean;
}

// Blue color for satellites
const SATELLITE_COLOR = 0x00BFFF;
const SATELLITE_GLOW = 0x0080FF;

const TYPE_COLORS: Record<string, number> = {
  military: 0xFF0040,
  commercial: 0x00BFFF,
  navigation: 0x00FF80,
  weather: 0xFFFF00,
  other: 0x808080,
};

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function SatelliteLayer({ satellites, globeRadius = 6, visible = true }: SatelliteLayerProps) {
  const markersRef = useRef<THREE.Object3D[]>([]);

  useEffect(() => {
    if (!visible) {
      markersRef.current.forEach(m => m.visible = false);
      return;
    }

    // Find globe group
    const globe = document.querySelector('[data-globe]') as any;
    if (!globe || !globe.__globeGroup) return;

    // Clean up old markers
    markersRef.current.forEach(m => {
      if (m.parent) m.parent.remove(m);
    });
    markersRef.current = [];

    const radius = globeRadius + 1.5; // Satellites higher up

    satellites.forEach((sat) => {
      const pos = latLonToVector3(sat.lat, sat.lon, radius);
      const color = TYPE_COLORS[sat.type] || SATELLITE_COLOR;
      
      const group = new THREE.Group();
      group.position.copy(pos);

      // Satellite body (small diamond shape)
      const geometry = new THREE.OctahedronGeometry(0.06, 0);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.9,
      });
      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      // Cross pattern for tech look
      const crossGeo1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.1, 0, 0),
        new THREE.Vector3(0.1, 0, 0),
      ]);
      const crossGeo2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.1, 0),
        new THREE.Vector3(0, 0.1, 0),
      ]);
      const crossMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
      group.add(new THREE.Line(crossGeo1, crossMat));
      group.add(new THREE.Line(crossGeo2, crossMat));

      // Glow
      const glowGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: SATELLITE_GLOW,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      // Orbit ring (small arc)
      const orbitGeo = new THREE.RingGeometry(0.3, 0.32, 32, 1, 0, Math.PI / 4);
      const orbitMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const orbit = new THREE.Mesh(orbitGeo, orbitMat);
      orbit.lookAt(new THREE.Vector3(0, 0, 0));
      group.add(orbit);

      group.userData = { 
        type: 'satellite', 
        satellite: sat,
        id: sat.id 
      };

      globe.__globeGroup.add(group);
      markersRef.current.push(group);
    });

    return () => {
      markersRef.current.forEach(m => {
        if (m.parent) m.parent.remove(m);
      });
      markersRef.current = [];
    };
  }, [satellites, globeRadius, visible]);

  return null;
}
