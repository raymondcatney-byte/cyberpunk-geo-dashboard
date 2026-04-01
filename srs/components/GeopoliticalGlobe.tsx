import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

// Sentinel Color Palette
const SENTINEL_COLORS = {
  amber: 0xFFB800,
  amberDim: 0xB8860B,
};

export interface GeopoliticalGlobeHandle {
  flyTo: (lat: number, lng: number, label?: string) => void;
}

function latLonToVector3(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

export const GeopoliticalGlobe = forwardRef<GeopoliticalGlobeHandle>(function GeopoliticalGlobe(_, ref) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0.001 });
  const isTransitioningRef = useRef(false);
  const targetLabelRef = useRef<HTMLDivElement | null>(null);

  // Expose flyTo method via imperative handle
  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, label?: string) => {
      const camera = cameraRef.current;
      if (!camera || isTransitioningRef.current) return;

      isTransitioningRef.current = true;

      // High orbital altitude for dramatic effect
      const radius = 28;
      const targetPos = latLonToVector3(lat, lng, radius);

      const startPos = camera.position.clone();
      const startTime = performance.now();
      const duration = 2500; // 2.5s for cinematic feel

      // Show target label
      if (label && targetLabelRef.current) {
        targetLabelRef.current.textContent = `TARGET: ${label}`;
        targetLabelRef.current.style.opacity = '1';
      }

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // EaseInOutCubic for smooth acceleration/deceleration
        const eased = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(startPos, targetPos, eased);
        camera.lookAt(0, 0, 0);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isTransitioningRef.current = false;
          rotationVelocityRef.current = { x: 0, y: 0.0003 }; // Slower rotation after target
          
          // Fade out label after delay
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
    scene.background = new THREE.Color(0x0a0a0a);

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

    // Main globe sphere with night texture
    const globeGeometry = new THREE.SphereGeometry(6, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x111118,
      emissive: 0x000510,
      emissiveIntensity: 0.3,
      specular: SENTINEL_COLORS.amber,
      shininess: 15,
      transparent: true,
      opacity: 0.95,
    });
    const globeMesh = new THREE.Mesh(globeGeometry, globeMaterial);
    globe.add(globeMesh);

    // Load night texture
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = 'anonymous';
    textureLoader.load(
      '/images/earth-night.jpg',
      (texture) => {
        globeMaterial.map = texture;
        globeMaterial.needsUpdate = true;
      },
      undefined,
      (err) => {
        console.warn('Failed to load night texture, using fallback:', err);
      }
    );

    // Amber atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(6.5, 64, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
      color: SENTINEL_COLORS.amber,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    globe.add(new THREE.Mesh(atmosphereGeometry, atmosphereMaterial));

    // Inner core glow
    const coreGeometry = new THREE.SphereGeometry(5.8, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x000816, 
      transparent: true, 
      opacity: 0.6 
    });
    globe.add(new THREE.Mesh(coreGeometry, coreMaterial));

    scene.add(new THREE.AmbientLight(0x404040, 1.5));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(SENTINEL_COLORS.amber, 0.5);
    rimLight.position.set(-10, 5, -10);
    scene.add(rimLight);

    scene.add(globe);

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

    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (globeRef.current && !isTransitioningRef.current) {
        globeRef.current.rotation.y += rotationVelocityRef.current.y;
        globeRef.current.rotation.x += rotationVelocityRef.current.x;
        globeRef.current.rotation.x = Math.max(
          -Math.PI / 3,
          Math.min(Math.PI / 3, globeRef.current.rotation.x)
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0a0a]">
      {/* Minimal corner accents */}
      <div className="absolute top-3 left-3 w-8 h-8 border-t border-l border-[#FFB800]/30 pointer-events-none z-10" />
      <div className="absolute top-3 right-3 w-8 h-8 border-t border-r border-[#FFB800]/30 pointer-events-none z-10" />
      <div className="absolute bottom-3 left-3 w-8 h-8 border-b border-l border-[#FFB800]/30 pointer-events-none z-10" />
      <div className="absolute bottom-3 right-3 w-8 h-8 border-b border-r border-[#FFB800]/30 pointer-events-none z-10" />

      {/* Globe container */}
      <div ref={mountRef} data-globe className="absolute inset-0" />

      {/* Target acquisition label */}
      <div 
        ref={targetLabelRef}
        className="absolute top-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-[#FFB800] tracking-[0.3em] opacity-0 transition-opacity duration-500 pointer-events-none z-20"
        style={{ textShadow: '0 0 10px rgba(255, 184, 0, 0.8)' }}
      >
        TARGET: 
      </div>

      {/* Minimal status - bottom left */}
      <div className="pointer-events-none absolute left-4 bottom-4 z-20">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#FFB800]/60 animate-pulse" />
          <span className="text-[9px] font-mono text-[#FFB800]/50 tracking-wider">GLOBE.ACTIVE</span>
        </div>
      </div>
    </div>
  );
});
