import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Aircraft } from '../lib/apis';

interface AircraftLayerProps {
  aircraft: Aircraft[];
  globeRadius?: number;
  visible?: boolean;
}

// Amber color for aircraft
const AIRCRAFT_COLOR = 0xFFB800;
const AIRCRAFT_GLOW = 0xFF8C00;

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export function AircraftLayer({ aircraft, globeRadius = 6, visible = true }: AircraftLayerProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const markersRef = useRef<THREE.Object3D[]>([]);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Get scene from parent
  useEffect(() => {
    // Find the globe group in the scene
    const checkScene = () => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        // @ts-ignore - accessing Three.js internals
        const renderer = canvas.__renderer;
        if (renderer) {
          sceneRef.current = renderer.scene;
        }
      }
    };
    checkScene();
  }, []);

  // Create/update aircraft markers
  useEffect(() => {
    if (!visible) {
      // Hide all markers
      markersRef.current.forEach(m => m.visible = false);
      return;
    }

    // Find globe group
    const globe = document.querySelector('[data-globe]') as any;
    if (!globe) return;

    // Clean up old markers
    markersRef.current.forEach(m => {
      if (m.parent) m.parent.remove(m);
    });
    markersRef.current = [];

    // Limit aircraft for performance and visual clarity
    const displayAircraft = aircraft.slice(0, 50);  // Reduced from 150 to minimize clustering
    const radius = globeRadius + 0.15;

    displayAircraft.forEach((ac, idx) => {
      const pos = latLonToVector3(ac.lat, ac.lon, radius);
      
      // Create aircraft marker group
      const group = new THREE.Group();
      group.position.copy(pos);
      group.lookAt(new THREE.Vector3(0, 0, 0));

      // Aircraft body (small cone pointing in direction)
      const geometry = new THREE.ConeGeometry(0.04, 0.12, 4);
      const material = new THREE.MeshBasicMaterial({
        color: AIRCRAFT_COLOR,
        transparent: true,
        opacity: 0.9,
      });
      const cone = new THREE.Mesh(geometry, material);
      cone.rotateX(Math.PI / 2);
      cone.rotateZ((ac.heading * Math.PI) / 180);
      group.add(cone);

      // Glow effect
      const glowGeo = new THREE.SphereGeometry(0.08, 8, 8);
      const glowMat = new THREE.MeshBasicMaterial({
        color: AIRCRAFT_GLOW,
        transparent: true,
        opacity: 0.3,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      // Altitude indicator line (if high altitude)
      if (ac.altitude > 30000) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0.1),
        ]);
        const lineMat = new THREE.LineBasicMaterial({ color: AIRCRAFT_COLOR, transparent: true, opacity: 0.5 });
        const line = new THREE.Line(lineGeo, lineMat);
        group.add(line);
      }

      // Store aircraft data for click handling
      group.userData = { 
        type: 'aircraft', 
        aircraft: ac,
        id: ac.hex 
      };

      // Add to globe
      if (globe.__globeGroup) {
        globe.__globeGroup.add(group);
        markersRef.current.push(group);
      }
    });

    return () => {
      markersRef.current.forEach(m => {
        if (m.parent) m.parent.remove(m);
      });
      markersRef.current = [];
    };
  }, [aircraft, globeRadius, visible]);

  return null; // This is a logic component, no DOM output
}
