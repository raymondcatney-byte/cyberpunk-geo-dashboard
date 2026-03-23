/**
 * Example: Integrating MarkerManager into GeopoliticalGlobe
 * 
 * This shows how to replace the existing aircraft marker logic
 * with the new MarkerManager class for better performance.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { MarkerManager } from './MarkerManager';
import type { AircraftState } from '../../lib/flightTracking';

// Simplified example - integrate into your existing GeopoliticalGlobe component

export function GeopoliticalGlobeWithMarkerManager() {
  const mountRef = useRef<HTMLDivElement>(null);
  const markerManagerRef = useRef<MarkerManager | null>(null);
  const aircraftRef = useRef<AircraftState[]>([]);
  
  // Your existing Three.js setup...
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster | null>(null);
  const mouseRef = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!mountRef.current) return;

    // Your existing scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 8, 22);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Initialize MarkerManager
    // globeRadius = 6.15 (matches your current setup)
    markerManagerRef.current = new MarkerManager(scene, 6.15);
    
    // Setup raycaster for click detection
    raycasterRef.current = new THREE.Raycaster();

    // Click handler using MarkerManager
    const onClick = (event: MouseEvent) => {
      const raycaster = raycasterRef.current;
      const camera = cameraRef.current;
      if (!raycaster || !camera || !markerManagerRef.current) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera(mouseRef.current, camera);
      
      // Use MarkerManager for raycasting
      const hitAircraft = markerManagerRef.current.getIntersects(raycaster);
      if (hitAircraft) {
        console.log('Clicked aircraft:', hitAircraft.callsign);
        // Show your existing aircraft panel
        // setSelectedAircraft(hitAircraft);
      }
    };

    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      // Update markers from aircraft data
      if (markerManagerRef.current) {
        markerManagerRef.current.updateAircraft(aircraftRef.current);
      }
      
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      renderer.domElement.removeEventListener('click', onClick);
      markerManagerRef.current?.dispose();
      renderer.dispose();
    };
  }, []);

  // Update aircraft data (called when your API returns new data)
  const updateAircraftData = (newAircraft: AircraftState[]) => {
    aircraftRef.current = newAircraft;
    // MarkerManager will pick this up in the next animation frame
  };

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
  );
}

/*
Integration steps for your existing GeopoliticalGlobe.tsx:

1. Replace this import:
   import { MarkerManager } from './globe/MarkerManager';

2. Replace these refs:
   // REMOVE: const aircraftRef = useRef<THREE.Object3D[]>([]);
   // ADD: const markerManagerRef = useRef<MarkerManager | null>(null);

3. In the scene initialization useEffect, replace aircraft marker creation:
   // REMOVE: All the aircraft marker creation code (lines ~454-509)
   // ADD: markerManagerRef.current = new MarkerManager(scene, 6.15);

4. Replace the click handler aircraft check:
   // REMOVE: const aircraftIntersects = raycaster.intersectObjects(aircraftRef.current, true);
   // REMOVE: all the aircraft click handling code
   // ADD: const hitAircraft = markerManagerRef.current?.getIntersects(raycaster);
   // ADD: if (hitAircraft) { setSelectedAircraft(hitAircraft); }

5. Replace the aircraft update useEffect:
   // REMOVE: The entire useEffect that creates/updates aircraft markers
   // ADD: In the animation loop, call markerManagerRef.current?.updateAircraft(aircraft);

6. In cleanup, add:
   markerManagerRef.current?.dispose();

That's it - same data source (OpenSky), same visual result, cleaner code.
*/
