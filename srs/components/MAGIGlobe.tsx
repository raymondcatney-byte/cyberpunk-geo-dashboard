import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import * as THREE from 'three';
import type { HexHeatmapGlobeHandle } from '../types/globe';
import { FINANCIAL_CENTERS } from '../types/globe';
import { LIVESTREAMS } from '../config/livestreams';

// NERV UI v2 Color Palette (Orange theme - no cyan)
const NERV_COLORS = {
  orange: 0xFF9830,      // NERV orange wireframe (was cyan)
  orangeDim: 0xCC6600,   // Dimmed orange
  orangeBright: 0xFFB800,// Bright orange for accents
  dataFlow: 0xFFAA50,    // Data flow lines
  green: 0x50FF50,       // Data green particles
  dark: 0x050508,        // Background dark
  grid: 0x3A2A1A,        // Grid lines (warm gray)
  yellow: 0xFFD700,      // Financial centers
  yellowDim: 0xB8860B,   // Dimmed yellow
};

interface MAGIGlobeProps {
  showLivestreamMarkers?: boolean;
  activeStreamId?: string | null;
  onCitySelect?: (id: string) => void;
}

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Generate random data flow lines
function generateDataLines(count: number, radius: number): THREE.Vector3[][] {
  const lines: THREE.Vector3[][] = [];
  for (let i = 0; i < count; i++) {
    const startLat = (Math.random() - 0.5) * 160;
    const startLon = (Math.random() - 0.5) * 360;
    const endLat = startLat + (Math.random() - 0.5) * 60;
    const endLon = startLon + (Math.random() - 0.5) * 60;
    
    const start = latLonToVector3(startLat, startLon, radius);
    const end = latLonToVector3(endLat, endLon, radius);
    
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.3);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(20);
    lines.push(points);
  }
  return lines;
}

// Create hexagon shape for markers
function createHexagonShape(size: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = size * Math.cos(angle);
    const y = size * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export const MAGIGlobe = forwardRef<HexHeatmapGlobeHandle, MAGIGlobeProps>(
  function MAGIGlobe(
    { showLivestreamMarkers = false, activeStreamId, onCitySelect },
    ref
  ) {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const globeRef = useRef<THREE.Group | null>(null);
    const dataLinesRef = useRef<THREE.Group | null>(null);
    const particlesRef = useRef<THREE.Points | null>(null);
    const cityMarkersRef = useRef<THREE.Group | null>(null);
    const livestreamMarkersRef = useRef<THREE.Group | null>(null);
    const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
    const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });
    const rotationVelocityRef = useRef({ x: 0, y: 0.001 });
    const isTransitioningRef = useRef(false);
    const targetLabelRef = useRef<HTMLDivElement | null>(null);
    const frameRef = useRef<number>(0);
    const isLoadingRef = useRef(true);

    // Create wireframe terrain sphere
    const createWireframeSphere = (radius: number, segments: number): THREE.LineSegments => {
      const geometry = new THREE.IcosahedronGeometry(radius, segments);
      const wireframe = new THREE.WireframeGeometry(geometry);
      const material = new THREE.LineBasicMaterial({ 
        color: NERV_COLORS.orange,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      return new THREE.LineSegments(wireframe, material);
    };

    // Create inner grid sphere
    const createGridSphere = (radius: number): THREE.LineSegments => {
      const points: THREE.Vector3[] = [];
      const segments = 24;
      
      for (let i = 1; i < segments; i++) {
        const lat = (i / segments) * Math.PI - Math.PI / 2;
        const r = Math.cos(lat) * radius;
        const y = Math.sin(lat) * radius;
        
        for (let j = 0; j <= segments; j++) {
          const lon = (j / segments) * Math.PI * 2;
          const x = Math.cos(lon) * r;
          const z = Math.sin(lon) * r;
          points.push(new THREE.Vector3(x, y, z));
          if (j < segments) {
            const nextLon = ((j + 1) / segments) * Math.PI * 2;
            points.push(new THREE.Vector3(Math.cos(nextLon) * r, y, Math.sin(nextLon) * r));
          }
        }
      }
      
      for (let i = 0; i < segments; i++) {
        const lon = (i / segments) * Math.PI * 2;
        for (let j = 0; j <= segments; j++) {
          const lat = (j / segments) * Math.PI - Math.PI / 2;
          const r = Math.cos(lat) * radius;
          const y = Math.sin(lat) * radius;
          const x = Math.cos(lon) * r;
          const z = Math.sin(lon) * r;
          points.push(new THREE.Vector3(x, y, z));
        }
      }
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ 
        color: NERV_COLORS.orangeDim,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending
      });
      return new THREE.LineSegments(geometry, material);
    };

    // Create city markers (financial centers)
    const createCityMarkers = useCallback((scene: THREE.Scene) => {
      const markersGroup = new THREE.Group();
      
      FINANCIAL_CENTERS.forEach((city) => {
        const position = latLonToVector3(city.lat, city.lng, 6);

        const barGeometry = new THREE.BoxGeometry(0.12, 0.8, 0.12);
        const barMaterial = new THREE.MeshPhongMaterial({
          color: NERV_COLORS.yellow,
          emissive: NERV_COLORS.yellowDim,
          emissiveIntensity: 0.8,
        });

        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.position.copy(position);
        bar.position.multiplyScalar(1.08);
        bar.lookAt(0, 0, 0);
        bar.rotateX(-Math.PI / 2);
        bar.userData = { type: 'city', city };

        const glowGeometry = new THREE.BoxGeometry(0.2, 1, 0.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: NERV_COLORS.yellow,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.copy(bar.position);
        glow.lookAt(0, 0, 0);
        glow.rotateX(-Math.PI / 2);

        markersGroup.add(bar);
        markersGroup.add(glow);
      });

      cityMarkersRef.current = markersGroup;
      scene.add(markersGroup);
    }, []);

    // Create livestream markers
    const createLivestreamMarkers = useCallback((scene: THREE.Scene) => {
      const markersGroup = new THREE.Group();
      
      LIVESTREAMS.forEach((stream) => {
        const position = latLonToVector3(stream.lat, stream.lng, 6);
        const surfaceOffset = 0.15;
        const markerPosition = position.clone().normalize().multiplyScalar(6 + surfaceOffset);

        const hexShape = createHexagonShape(0.3);
        const hexGeometry = new THREE.ExtrudeGeometry(hexShape, {
          depth: 0.08,
          bevelEnabled: true,
          bevelThickness: 0.02,
          bevelSize: 0.02,
          bevelSegments: 2,
        });
        hexGeometry.translate(0, 0, -0.04);

        const hexMaterial = new THREE.MeshPhongMaterial({
          color: NERV_COLORS.orange,
          emissive: NERV_COLORS.orangeDim,
          emissiveIntensity: 0.9,
          specular: 0xffffff,
          shininess: 60,
        });

        const hex = new THREE.Mesh(hexGeometry, hexMaterial);
        hex.position.copy(markerPosition);
        hex.lookAt(0, 0, 0);
        hex.rotateX(Math.PI);
        hex.userData = { type: 'livestream', markerId: stream.id, stream };
        markersGroup.add(hex);
      });

      livestreamMarkersRef.current = markersGroup;
      markersGroup.visible = showLivestreamMarkers;
      scene.add(markersGroup);
    }, [showLivestreamMarkers]);

    // Expose flyTo method via imperative handle
    useImperativeHandle(ref, () => ({
      flyTo: (lat: number, lng: number, label?: string) => {
        const camera = cameraRef.current;
        if (!camera || isTransitioningRef.current) return;

        isTransitioningRef.current = true;

        const radius = 28;
        const targetPos = latLonToVector3(lat, lng, radius);

        const startPos = camera.position.clone();
        const startTime = performance.now();
        const duration = 2500;

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
          camera.lookAt(0, 0, 0);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            isTransitioningRef.current = false;
            rotationVelocityRef.current = { x: 0, y: 0.0003 };
            
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

    useEffect(() => {
      const mount = mountRef.current;
      if (!mount) return;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(NERV_COLORS.dark);

      const camera = new THREE.PerspectiveCamera(
        45,
        mount.clientWidth / Math.max(1, mount.clientHeight),
        0.1,
        1000
      );
      camera.position.set(0, 0, 22);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      mount.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const globe = new THREE.Group();
      globeRef.current = globe;

      // Core sphere - dark inner body
      const coreGeometry = new THREE.SphereGeometry(5.5, 32, 32);
      const coreMaterial = new THREE.MeshBasicMaterial({ 
        color: NERV_COLORS.dark,
        transparent: true,
        opacity: 0.9
      });
      globe.add(new THREE.Mesh(coreGeometry, coreMaterial));

      // Wireframe terrain - cyan mesh
      const wireframeMesh = createWireframeSphere(6, 2);
      wireframeMesh.userData = { isWireframe: true };
      globe.add(wireframeMesh);

      // Inner grid sphere
      const gridSphere = createGridSphere(5.8);
      globe.add(gridSphere);

      // Outer glow ring
      const ringGeometry = new THREE.RingGeometry(7, 7.2, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: NERV_COLORS.cyan,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      globe.add(ring);

      // Data flow lines - orange
      const dataLinesGroup = new THREE.Group();
      dataLinesRef.current = dataLinesGroup;
      const lineData = generateDataLines(15, 6.2);
      
      lineData.forEach((points, i) => {
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: NERV_COLORS.orange,
          transparent: true,
          opacity: 0.4 + Math.random() * 0.3,
          blending: THREE.AdditiveBlending
        });
        const line = new THREE.Line(geometry, material);
        line.userData = { 
          speed: 0.5 + Math.random() * 0.5,
          offset: Math.random() * Math.PI * 2,
          originalOpacity: material.opacity
        };
        dataLinesGroup.add(line);
      });
      globe.add(dataLinesGroup);

      // Floating particles - green data points
      const particleCount = 200;
      const particleGeometry = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);
      const particleVelocities: number[] = [];
      
      for (let i = 0; i < particleCount; i++) {
        const lat = (Math.random() - 0.5) * 180;
        const lon = (Math.random() - 0.5) * 360;
        const r = 6.5 + Math.random() * 3;
        const pos = latLonToVector3(lat, lon, r);
        particlePositions[i * 3] = pos.x;
        particlePositions[i * 3 + 1] = pos.y;
        particlePositions[i * 3 + 2] = pos.z;
        particleVelocities.push(0.002 + Math.random() * 0.003);
      }
      
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      
      const particleMaterial = new THREE.PointsMaterial({
        color: NERV_COLORS.green,
        size: 0.08,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      particlesRef.current = particles;
      globe.add(particles);

      // Create markers
      createCityMarkers(scene);
      createLivestreamMarkers(scene);

      // Lighting
      const ambientLight = new THREE.AmbientLight(NERV_COLORS.cyan, 0.3);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(NERV_COLORS.cyanDim, 0.5);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      const rimLight = new THREE.DirectionalLight(NERV_COLORS.orange, 0.3);
      rimLight.position.set(-10, 5, -10);
      scene.add(rimLight);

      scene.add(globe);

      // Click handler for livestream markers
      const onClick = (event: MouseEvent) => {
        if (!mount || !cameraRef.current || !onCitySelect) return;
        
        const rect = mount.getBoundingClientRect();
        mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
        
        if (livestreamMarkersRef.current) {
          const intersects = raycasterRef.current.intersectObjects(livestreamMarkersRef.current.children);
          if (intersects.length > 0) {
            const markerId = intersects[0].object.userData.markerId;
            if (markerId) {
              onCitySelect(markerId);
            }
          }
        }
      };

      const onResize = () => {
        const { width, height } = mount.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
      };

      const onPointerDown = (event: PointerEvent) => {
        if (isTransitioningRef.current) return;
        isDraggingRef.current = true;
        lastMouseRef.current = { x: event.clientX, y: event.clientY };
        rotationVelocityRef.current = { x: 0, y: 0 };
      };

      const onPointerMove = (event: PointerEvent) => {
        if (!isDraggingRef.current || isTransitioningRef.current) return;
        const deltaX = event.clientX - lastMouseRef.current.x;
        const deltaY = event.clientY - lastMouseRef.current.y;
        rotationVelocityRef.current = {
          x: deltaY * 0.005,
          y: deltaX * 0.005,
        };
        lastMouseRef.current = { x: event.clientX, y: event.clientY };
      };

      const onPointerUp = () => {
        isDraggingRef.current = false;
        setTimeout(() => {
          if (!isDraggingRef.current && !isTransitioningRef.current) {
            rotationVelocityRef.current = { x: 0, y: 0.001 };
          }
        }, 100);
      };

      window.addEventListener('resize', onResize);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('click', onClick);

      let animationId: number;
      const animate = (time: number) => {
        animationId = requestAnimationFrame(animate);
        frameRef.current = time;

        if (globeRef.current && !isTransitioningRef.current) {
          globeRef.current.rotation.y += rotationVelocityRef.current.y;
          globeRef.current.rotation.x += rotationVelocityRef.current.x;
          globeRef.current.rotation.x = Math.max(
            -Math.PI / 3,
            Math.min(Math.PI / 3, globeRef.current.rotation.x)
          );
          
          // Rotate inner grid slightly differently
          const grid = globeRef.current.children.find(c => c.type === 'LineSegments' && !c.userData.isWireframe);
          if (grid) {
            grid.rotation.y -= 0.0005;
          }
        }

        // Animate data lines - pulse effect
        if (dataLinesRef.current) {
          dataLinesRef.current.children.forEach((line) => {
            if (line instanceof THREE.Line && line.material instanceof THREE.LineBasicMaterial) {
              const pulse = Math.sin(time * 0.001 * line.userData.speed + line.userData.offset);
              line.material.opacity = line.userData.originalOpacity * (0.5 + pulse * 0.5);
            }
          });
        }

        // Animate particles
        if (particlesRef.current) {
          const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
          for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 1] += particleVelocities[i];
            if (positions[i * 3 + 1] > 10) {
              positions[i * 3 + 1] = -10;
            }
          }
          particlesRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Rotate ring
        const ring = globeRef.current?.children.find(c => c instanceof THREE.Mesh && c.geometry instanceof THREE.RingGeometry);
        if (ring) {
          ring.rotation.z += 0.001;
        }

        renderer.render(scene, camera);
      };
      animate(0);

      // Done loading
      isLoadingRef.current = false;

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onResize);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('click', onClick);
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }, [createCityMarkers, createLivestreamMarkers, onCitySelect]);

    // Update livestream markers visibility
    useEffect(() => {
      if (livestreamMarkersRef.current) {
        livestreamMarkersRef.current.visible = showLivestreamMarkers;
      }
    }, [showLivestreamMarkers]);

    // Update active marker visual state
    useEffect(() => {
      if (!livestreamMarkersRef.current) return;

      livestreamMarkersRef.current.children.forEach((child) => {
        const mesh = child as THREE.Mesh;
        const isActive = mesh.userData.markerId === activeStreamId;
        
        if (mesh.material instanceof THREE.MeshPhongMaterial) {
          mesh.material.emissiveIntensity = isActive ? 1.5 : 0.9;
          mesh.material.color.setHex(isActive ? NERV_COLORS.yellow : NERV_COLORS.orange);
        }
      });
    }, [activeStreamId]);

    return (
      <div className="relative h-full w-full overflow-hidden" style={{ background: '#050508' }}>
        {/* MAGI Corner Accents - Orange */}
        <div className="absolute top-3 left-3 w-12 h-12 border-t-2 border-l-2 border-orange-500/40 pointer-events-none z-10" />
        <div className="absolute top-3 right-3 w-12 h-12 border-t-2 border-r-2 border-orange-500/40 pointer-events-none z-10" />
        <div className="absolute bottom-3 left-3 w-12 h-12 border-b-2 border-l-2 border-orange-500/40 pointer-events-none z-10" />
        <div className="absolute bottom-3 right-3 w-12 h-12 border-b-2 border-r-2 border-orange-500/40 pointer-events-none z-10" />

        {/* MAGI Status Bars */}
        <div className="absolute top-3 left-16 right-16 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-3 left-16 right-16 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent pointer-events-none z-10" />

        {/* Globe container */}
        <div ref={mountRef} data-globe className="absolute inset-0" />

        {/* Target acquisition label - NERV Orange */}
        <div 
          ref={targetLabelRef}
          className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono opacity-0 transition-opacity duration-500 pointer-events-none z-20"
          style={{ 
            color: '#FF9830',
            letterSpacing: '0.3em',
            textShadow: '0 0 10px rgba(255, 152, 48, 0.8)'
          }}
        >
          TARGET: 
        </div>

        {/* MAGI Status - Bottom left */}
        <div className="pointer-events-none absolute left-4 bottom-4 z-20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-400/80 animate-pulse" 
                 style={{ boxShadow: '0 0 8px rgba(255, 152, 48, 0.6)' }} />
            <span className="text-[9px] font-mono tracking-wider" style={{ color: '#FF983099' }}>
              MAGI.SYS ONLINE
            </span>
          </div>
          <div className="mt-1 text-[8px] font-mono" style={{ color: '#50FF5066' }}>
            DATA LINK: ACTIVE
          </div>
        </div>

        {/* MAGI Indicators - Top right */}
        <div className="pointer-events-none absolute right-4 top-4 z-20 text-right">
          <div className="text-[9px] font-mono tracking-wider" style={{ color: '#FF9830AA' }}>
            MELCHIOR • BALTHASAR • CASPER
          </div>
          <div className="mt-1 flex justify-end gap-1">
            <div className="w-4 h-1 bg-green-500/60" />
            <div className="w-4 h-1 bg-green-500/60" />
            <div className="w-4 h-1 bg-green-500/60" />
          </div>
        </div>

        {/* City List - Above Market Activity */}
        {showLivestreamMarkers && onCitySelect && (
          <div className="absolute bottom-36 left-4 p-3 bg-black/90 border border-orange-500/50 rounded max-h-48 overflow-y-auto w-40 z-30">
            <div className="text-[10px] text-orange-400 font-mono uppercase mb-2 border-b border-orange-500/30 pb-1">
              Live Cities
            </div>
            <div className="space-y-1">
              {LIVESTREAMS.map((stream) => (
                <button
                  key={stream.id}
                  onClick={() => onCitySelect(stream.id)}
                  className={`w-full text-left text-[10px] font-mono uppercase tracking-wide transition-colors hover:text-white truncate ${
                    activeStreamId === stream.id ? 'text-orange-400 font-bold' : 'text-orange-600'
                  }`}
                  title={`${stream.city}, ${stream.country}`}
                >
                  <span className="inline-block w-2 h-2 mr-2 rounded-full flex-shrink-0" style={{ backgroundColor: activeStreamId === stream.id ? '#FF9830' : '#666' }} />
                  <span className="truncate">{stream.city}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 p-3 bg-black/80 border border-orange-500/40 rounded z-30">
          <div className="text-[10px] text-orange-400 font-mono uppercase mb-2">
            MAGI Visualization
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400/50" />
              <span className="text-[9px] text-orange-600">Wireframe Terrain</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-300/50" />
              <span className="text-[9px] text-orange-500">Data Flow</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
              <span className="text-[9px] text-yellow-600">Financial Centers</span>
            </div>
            {showLivestreamMarkers && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rotate-45 scale-75 bg-orange-500" />
                <span className="text-[9px] text-orange-600">Live Cameras</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-4 right-4 text-[10px] text-orange-600/60 font-mono z-30">
          Drag to rotate • Scroll to zoom
        </div>
      </div>
    );
  }
);
