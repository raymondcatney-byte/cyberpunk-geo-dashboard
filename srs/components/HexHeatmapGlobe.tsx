import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import type { HexHeatmapGlobeHandle, HexCell, CityMarker } from '../types/globe';
import { FINANCIAL_CENTERS } from '../types/globe';
import { 
  getFibonacciSpherePoints, 
  latLonToVector3, 
  createHexagonShape, 
  getHeatmapColor,
  assignMarketData,
  assignCellRegions
} from '../lib/hexGlobeUtils';

// Configuration
const GLOBE_RADIUS = 10;
const HEX_COUNT = 800; // More cells for denser coverage
const HEX_SIZE = 0.42; // Larger hexes to touch adjacent ones
const HEX_GAP = 0.0; // No gap - adjacent hexagons

export const HexHeatmapGlobe = forwardRef<HexHeatmapGlobeHandle>(function HexHeatmapGlobe(_, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const hexMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const cityMarkersRef = useRef<THREE.Group | null>(null);
  const frameRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);
  const targetLabelRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const cellsRef = useRef<HexCell[]>([]);
  const citiesRef = useRef<CityMarker[]>(FINANCIAL_CENTERS);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 35);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 15;
    controls.maxDistance = 60;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // Starfield background
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 200;
      starPositions[i + 1] = (Math.random() - 0.5) * 200;
      starPositions[i + 2] = (Math.random() - 0.5) * 200;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ 
      color: 0x888888, 
      size: 0.2,
      transparent: true,
      opacity: 0.6
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Atmospheric glow (inner sphere)
    const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 0.98, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x1a0f00,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphere);

    // Create hex grid
    createHexGrid(scene);

    // Create city markers
    createCityMarkers(scene);

    // Orbital ring
    createOrbitalRing(scene);

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Fetch market data
    fetchMarketData();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Create hexagonal grid on sphere
  const createHexGrid = (scene: THREE.Scene) => {
    const points = getFibonacciSpherePoints(HEX_COUNT, GLOBE_RADIUS);
    
    // Create base hexagon geometry
    const hexShape = createHexagonShape(HEX_SIZE);
    const hexGeometry = new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.2,
      bevelEnabled: false
    });
    
    // Center geometry
    hexGeometry.translate(0, 0, -0.1);
    
    // Create instanced mesh
    const hexMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a0f00,
      emissive: 0x000000,
      specular: 0x222222,
      shininess: 30,
      transparent: true,
      opacity: 0.9
    });
    
    const hexMesh = new THREE.InstancedMesh(hexGeometry, hexMaterial, HEX_COUNT);
    hexMeshRef.current = hexMesh;
    
    const dummy = new THREE.Object3D();
    const cells: Omit<HexCell, 'region'>[] = [];
    
    points.forEach((point, i) => {
      // Position
      dummy.position.set(point.x, point.y, point.z);
      
      // Orient to face outward
      dummy.lookAt(0, 0, 0);
      dummy.rotateX(Math.PI); // Flip to face outward
      
      // Scale based on distance from center (slight variation)
      const scale = 0.8 + Math.random() * 0.4;
      dummy.scale.set(scale, scale, 1);
      
      dummy.updateMatrix();
      hexMesh.setMatrixAt(i, dummy.matrix);
      
      cells.push({
        id: i,
        lat: point.lat,
        lng: point.lng,
        intensity: 0,
        marketCount: 0,
        volume: 0
      });
    });
    
    hexMesh.instanceMatrix.needsUpdate = true;
    scene.add(hexMesh);
    
    // Assign regions and store cells
    cellsRef.current = assignCellRegions(cells);
    
    // Add wireframe overlay
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.25, // Slightly more visible wireframe
      wireframe: true
    });
    const wireframeMesh = new THREE.Mesh(hexGeometry, wireframeMaterial);
    const wireframeInstanced = new THREE.InstancedMesh(wireframeMesh.geometry, wireframeMaterial, HEX_COUNT);
    
    points.forEach((point, i) => {
      dummy.position.set(point.x, point.y, point.z);
      dummy.lookAt(0, 0, 0);
      dummy.rotateX(Math.PI);
      const scale = 0.8 + Math.random() * 0.4;
      dummy.scale.set(scale, scale, 1.02); // Slightly larger for wireframe
      dummy.updateMatrix();
      wireframeInstanced.setMatrixAt(i, dummy.matrix);
    });
    
    wireframeInstanced.instanceMatrix.needsUpdate = true;
    scene.add(wireframeInstanced);
  };

  // Create yellow city markers
  const createCityMarkers = (scene: THREE.Scene) => {
    const markersGroup = new THREE.Group();
    cityMarkersRef.current = markersGroup;
    
    citiesRef.current.forEach((city) => {
      const position = latLonToVector3(city.lat, city.lng, GLOBE_RADIUS);
      
      // Marker bar geometry
      const barGeometry = new THREE.BoxGeometry(0.15, 1, 0.15);
      const barMaterial = new THREE.MeshPhongMaterial({
        color: 0xffff00,
        emissive: 0xffcc00,
        emissiveIntensity: 0.9 // Increased opacity/brightness
      });
      
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.copy(position);
      bar.position.multiplyScalar(1.05); // Slightly above surface
      bar.lookAt(0, 0, 0);
      bar.rotateX(-Math.PI / 2); // Point outward
      bar.userData = { city }; // Store city data for interaction
      
      // Glow effect (slightly larger mesh)
      const glowGeometry = new THREE.BoxGeometry(0.25, 1.2, 0.25);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.6 // Increased glow opacity
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(bar.position);
      glow.lookAt(0, 0, 0);
      glow.rotateX(-Math.PI / 2);
      
      markersGroup.add(bar);
      markersGroup.add(glow);
    });
    
    scene.add(markersGroup);
  };

  // Create orbital ring
  const createOrbitalRing = (scene: THREE.Scene) => {
    const ringGeometry = new THREE.TorusGeometry(GLOBE_RADIUS * 1.4, 0.02, 16, 100);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xe8a03c,
      transparent: true,
      opacity: 0.3
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.y = Math.PI / 6;
    scene.add(ring);
    
    // Animate ring
    const animateRing = () => {
      ring.rotation.z += 0.001;
      requestAnimationFrame(animateRing);
    };
    animateRing();
  };

  // Fetch and apply market data
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/search?action=opportunities');
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      if (!data.ok || !data.opportunities) return;
      
      const markets = data.opportunities.map((opp: any) => ({
        question: opp.market?.question || '',
        volume: opp.market?.volume || 0,
        category: opp.market?.category || '',
        slug: opp.market?.slug || '',
        url: opp.market?.url || ''
      }));
      
      // Assign data to cells and cities
      const { cells, cityMarkers } = assignMarketData(
        cellsRef.current,
        citiesRef.current,
        markets
      );
      
      cellsRef.current = cells;
      citiesRef.current = cityMarkers;
      
      // Update hex colors
      updateHexColors();
      
      // Update city marker heights
      updateCityMarkers();
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      setIsLoading(false);
    }
  };

  // Update hex cell colors based on intensity
  const updateHexColors = () => {
    const hexMesh = hexMeshRef.current;
    if (!hexMesh) return;
    
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    
    cellsRef.current.forEach((cell, i) => {
      // Get current matrix
      hexMesh.getMatrixAt(i, dummy.matrix);
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
      
      // Update color
      const heatColor = getHeatmapColor(cell.intensity);
      hexMesh.setColorAt(i, heatColor);
      
      // Update height based on intensity
      dummy.scale.z = 1 + cell.intensity * 2;
      dummy.updateMatrix();
      hexMesh.setMatrixAt(i, dummy.matrix);
    });
    
    hexMesh.instanceColor!.needsUpdate = true;
    hexMesh.instanceMatrix.needsUpdate = true;
  };

  // Update city marker heights based on volume
  const updateCityMarkers = () => {
    if (!cityMarkersRef.current) return;
    
    citiesRef.current.forEach((city, index) => {
      const bar = cityMarkersRef.current!.children[index * 2] as THREE.Mesh;
      const glow = cityMarkersRef.current!.children[index * 2 + 1] as THREE.Mesh;
      
      if (bar && glow) {
        // Scale height based on relative volume
        const heightScale = 0.5 + city.volume * 3;
        bar.scale.y = heightScale;
        glow.scale.y = heightScale * 1.2;
        
        // Update emissive intensity
        const material = bar.material as THREE.MeshPhongMaterial;
        material.emissiveIntensity = 0.3 + city.volume * 0.7;
      }
    });
  };

  // Expose flyTo method
  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, label?: string) => {
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls || isTransitioningRef.current) return;

      isTransitioningRef.current = true;
      controls.autoRotate = false;

      // Calculate target position
      const radius = 28;
      const targetPos = latLonToVector3(lat, lng, radius);

      const startPos = camera.position.clone();
      const startTime = performance.now();
      const duration = 2500;

      // Show target label
      if (label && targetLabelRef.current) {
        targetLabelRef.current.textContent = `TARGET: ${label}`;
        targetLabelRef.current.style.opacity = '1';
      }

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const eased = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(startPos, targetPos, eased);
        controls.target.set(0, 0, 0);
        controls.update();

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isTransitioningRef.current = false;
          controls.autoRotate = true;
          controls.autoRotateSpeed = 0.3;
          
          setTimeout(() => {
            if (targetLabelRef.current) {
              targetLabelRef.current.style.opacity = '0';
            }
          }, 2000);
        }
      };
      requestAnimationFrame(animate);
    }
  }));

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-nerv-orange font-mono text-sm animate-pulse">
            INITIALIZING HEX GRID...
          </div>
        </div>
      )}
      
      {/* Globe container */}
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Target label overlay */}
      <div
        ref={targetLabelRef}
        className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-nerv-orange/20 border border-nerv-orange text-nerv-orange font-mono text-xs uppercase tracking-wider opacity-0 transition-opacity duration-300 pointer-events-none"
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 p-3 bg-black/80 border border-nerv-brown rounded">
        <div className="text-[10px] text-nerv-rust font-mono uppercase mb-2">Market Activity</div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 rounded" style={{
            background: 'linear-gradient(to right, #1a0f00, #e8a03c, #ff6600, #ff0040, #ffffff)'
          }} />
        </div>
        <div className="flex justify-between text-[9px] text-nerv-rust mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="w-2 h-4 bg-yellow-400 rounded-sm" />
          <span className="text-[9px] text-nerv-rust">Financial Centers</span>
        </div>
      </div>
      
      {/* Controls hint */}
      <div className="absolute bottom-4 right-4 text-[10px] text-nerv-rust/60 font-mono">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
});
