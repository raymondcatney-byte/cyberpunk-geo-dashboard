/**
 * StrategicGlobeLayers - War Room Strategic Data Visualization
 * Adds trade routes, economic zones, infrastructure, military bases, and heat maps
 * to the GeopoliticalGlobe without modifying any UI structure
 * 
 * NO UI CHANGES - purely internal globe rendering
 */

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  TRADE_ROUTES,
  ECONOMIC_ZONES,
  INFRASTRUCTURE,
  MILITARY_BASES,
  RISK_HEAT_ZONES,
  type LayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  LAYER_COLORS,
  latLonToVector3,
  createHeatMapMaterial,
} from '../services/globeLayerService';
import { globeDataFeed, type GlobePoint, type GlobeArc, type GlobeLayer } from '../services/globeDataFeed';

interface StrategicGlobeLayersProps {
  globeGroup?: THREE.Group | null;
  visibility?: LayerVisibility;
}

// Extend the GeopoliticalGlobe's group with our layers
export function useStrategicLayers(
  globeContainerRef: React.RefObject<HTMLElement>,
  visibility: LayerVisibility = DEFAULT_LAYER_VISIBILITY
) {
  const layersGroupRef = useRef<THREE.Group | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  const arcsGroupRef = useRef<THREE.Group | null>(null);
  const regionsGroupRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number | null>(null);
  const pointMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const arcMeshesRef = useRef<Map<string, THREE.Line>>(new Map());
  const regionMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());

  const GLOBE_RADIUS = 6.15;

  // Create a point mesh for a GlobePoint
  const createPointMesh = useCallback((point: GlobePoint): THREE.Mesh => {
    const pos = latLonToVector3(point.lat, point.lng, GLOBE_RADIUS);
    
    // Geometry based on layer type
    let geometry: THREE.BufferGeometry;
    
    if (point.layer === 'vessels' || point.layer === 'flights') {
      // Directional triangle for moving objects
      geometry = new THREE.ConeGeometry(point.size * 0.15, point.size * 0.3, 3);
    } else if (point.layer === 'militaryBases') {
      // Diamond shape
      geometry = new THREE.ConeGeometry(point.size * 0.15, point.size * 0.3, 4);
    } else if (point.layer === 'economicZones') {
      // Hexagon
      geometry = new THREE.CylinderGeometry(point.size * 0.15, point.size * 0.15, 0.02, 6);
    } else {
      // Default sphere
      geometry = new THREE.SphereGeometry(point.size * 0.12, 16, 16);
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: point.color,
      transparent: true,
      opacity: point.opacity,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    
    // Orient to surface normal
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    
    // For cones, flip to point outward
    if (point.layer === 'vessels' || point.layer === 'flights' || point.layer === 'militaryBases') {
      mesh.rotateX(Math.PI);
    }
    
    // Apply heading for moving objects
    if (point.heading !== undefined) {
      mesh.rotateZ(-point.heading * Math.PI / 180);
    }
    
    // Store data for interaction
    mesh.userData = {
      type: 'globePoint',
      pointId: point.id,
      layer: point.layer,
      lat: point.lat,
      lng: point.lng,
      title: point.title,
      description: point.description,
      makaveliQuery: point.makaveliQuery,
      bruceQuery: point.bruceQuery,
      polymarketMarketId: point.polymarketMarketId,
      pulse: point.pulse,
      baseScale: 1,
    };
    
    // Add pulse ring if needed
    if (point.pulse) {
      const ringGeo = new THREE.RingGeometry(point.size * 0.2, point.size * 0.35, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: point.color,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData = { isPulse: true, parentId: point.id };
      mesh.add(ring);
    }
    
    return mesh;
  }, []);

  // Create an arc mesh for trade routes
  const createArcMesh = useCallback((arc: GlobeArc): THREE.Line => {
    const startPos = latLonToVector3(arc.from.lat, arc.from.lng, GLOBE_RADIUS);
    const endPos = latLonToVector3(arc.to.lat, arc.to.lng, GLOBE_RADIUS);
    
    // Create curved path
    const midPoint = startPos.clone().add(endPos).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 1.3);
    const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, endPos);
    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    const material = new THREE.LineBasicMaterial({
      color: arc.color,
      transparent: true,
      opacity: 0.5,
      linewidth: Math.max(1, arc.width),
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData = {
      type: 'globeArc',
      arcId: arc.id,
      animated: arc.animated,
      volume: arc.volume,
    };
    
    return line;
  }, []);

  // Create region mesh for heatmaps
  const createRegionMesh = useCallback((region: any): THREE.Mesh => {
    const centerLat = (region.bounds.north + region.bounds.south) / 2;
    const centerLng = (region.bounds.east + region.bounds.west) / 2;
    const pos = latLonToVector3(centerLat, centerLng, GLOBE_RADIUS + 0.05);
    
    // Approximate radius based on bounds
    const latSpan = region.bounds.north - region.bounds.south;
    const radius = Math.max(0.1, latSpan / 10);
    
    const geometry = new THREE.CircleGeometry(radius, 32);
    const material = createHeatMapMaterial(region.intensity, region.sentiment === 'fear' ? 'conflict' : 'economic');
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    mesh.userData = {
      type: 'globeRegion',
      regionId: region.id,
      layer: region.layer,
      intensity: region.intensity,
      material: material,
    };
    
    return mesh;
  }, []);

  // Update points from data feed
  const updatePoints = useCallback((points: GlobePoint[]) => {
    if (!pointsGroupRef.current) return;
    
    // Get current active layers from visibility
    const activeLayers = new Set<GlobeLayer>([
      visibility.tradeRoutes ? 'tradeRoutes' : null,
      visibility.economicZones ? 'economicZones' : null,
      visibility.infrastructure ? 'infrastructure' : null,
      visibility.militaryBases ? 'militaryBases' : null,
      visibility.riskHeatMap ? 'conflicts' : null,
      visibility.conflicts ? 'conflicts' : null,
      visibility.markets ? 'markets' : null,
    ].filter(Boolean) as GlobeLayer[]);
    
    // Filter points to only show active layers
    const visiblePoints = points.filter(p => activeLayers.has(p.layer));
    
    // Remove old meshes that aren't in new data
    const currentIds = new Set(visiblePoints.map(p => p.id));
    for (const [id, mesh] of pointMeshesRef.current) {
      if (!currentIds.has(id)) {
        pointsGroupRef.current.remove(mesh);
        pointMeshesRef.current.delete(id);
      }
    }
    
    // Add or update meshes
    for (const point of visiblePoints) {
      let mesh = pointMeshesRef.current.get(point.id);
      
      if (!mesh) {
        mesh = createPointMesh(point);
        pointsGroupRef.current.add(mesh);
        pointMeshesRef.current.set(point.id, mesh);
      } else {
        // Update position for moving objects
        if (point.layer === 'vessels' || point.layer === 'flights') {
          const newPos = latLonToVector3(point.lat, point.lng, GLOBE_RADIUS);
          mesh.position.copy(newPos);
          mesh.lookAt(new THREE.Vector3(0, 0, 0));
          mesh.rotateX(Math.PI);
          if (point.heading !== undefined) {
            mesh.rotateZ(-point.heading * Math.PI / 180);
          }
        }
      }
    }
  }, [createPointMesh, visibility]);

  // Update arcs from data feed
  const updateArcs = useCallback((arcs: GlobeArc[]) => {
    if (!arcsGroupRef.current) return;
    
    if (!visibility.tradeRoutes) {
      // Hide all arcs
      arcsGroupRef.current.visible = false;
      return;
    }
    arcsGroupRef.current.visible = true;
    
    // Remove old arcs
    for (const [id, line] of arcMeshesRef.current) {
      arcsGroupRef.current.remove(line);
      line.geometry.dispose();
    }
    arcMeshesRef.current.clear();
    
    // Add new arcs
    for (const arc of arcs) {
      const line = createArcMesh(arc);
      arcsGroupRef.current.add(line);
      arcMeshesRef.current.set(arc.id, line);
    }
  }, [createArcMesh, visibility.tradeRoutes]);

  // Initialize and manage layers
  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return;

    // Access the globe group
    const globeGroup = (container as any).__globeGroup as THREE.Group | undefined;
    if (!globeGroup) {
      const checkInterval = setInterval(() => {
        const retryGroup = (container as any).__globeGroup as THREE.Group | undefined;
        if (retryGroup) {
          clearInterval(checkInterval);
          initializeLayers(retryGroup);
        }
      }, 500);
      setTimeout(() => clearInterval(checkInterval), 10000);
      return;
    }

    initializeLayers(globeGroup);

    function initializeLayers(targetGroup: THREE.Group) {
      // Create main layers group
      const layersGroup = new THREE.Group();
      layersGroup.name = 'strategicLayers';
      targetGroup.add(layersGroup);
      layersGroupRef.current = layersGroup;
      
      // Create sub-groups
      pointsGroupRef.current = new THREE.Group();
      pointsGroupRef.current.name = 'points';
      layersGroup.add(pointsGroupRef.current);
      
      arcsGroupRef.current = new THREE.Group();
      arcsGroupRef.current.name = 'arcs';
      layersGroup.add(arcsGroupRef.current);
      
      regionsGroupRef.current = new THREE.Group();
      regionsGroupRef.current.name = 'regions';
      layersGroup.add(regionsGroupRef.current);
      
      // Subscribe to data feed
      const unsubscribe = globeDataFeed.subscribe((state) => {
        updatePoints(state.points);
        updateArcs(state.arcs);
      });
      
      // Initialize with default data
      initializeDefaultData();
      
      // Animation loop for pulses
      let time = 0;
      const animate = () => {
        time += 0.016;
        
        // Animate pulses
        for (const mesh of pointMeshesRef.current.values()) {
          if (mesh.userData.pulse) {
            mesh.children.forEach((child: any) => {
              if (child.userData.isPulse) {
                const scale = 1 + Math.sin(time * 3) * 0.2;
                child.scale.setScalar(scale);
                child.material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
              }
            });
          }
        }
        
        // Animate heatmap materials
        for (const mesh of regionMeshesRef.current.values()) {
          if (mesh.userData.material?.uniforms?.uTime) {
            mesh.userData.material.uniforms.uTime.value = time;
          }
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };
      animate();
      
      // Cleanup on unmount
      return () => {
        unsubscribe();
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (layersGroupRef.current) {
        layersGroupRef.current.parent?.remove(layersGroupRef.current);
      }
    };
  }, [globeContainerRef, updatePoints, updateArcs]);

  // Initialize default data from existing constants
  const initializeDefaultData = useCallback(() => {
    // Inject trade routes as arcs (only visible by default)
    const tradeArcs: GlobeArc[] = Object.values(TRADE_ROUTES).map((route, idx) => ({
      id: `trade-${idx}`,
      from: route.path[0],
      to: route.path[1] || route.path[0],
      color: LAYER_COLORS.tradeRoute.toString(16).padStart(6, '0'),
      width: route.importance === 'critical' ? 2 : 1,
      animated: true,
      volume: parseInt(route.throughput) || 1000,
      label: route.name,
      throughput: route.throughput,
    }));
    globeDataFeed.injectArcs(tradeArcs);
    
    // Other layers disabled by default - too cluttered
    // Enable via strategicLayers state when needed
    
    // Inject economic zones (hidden by default)
    // globeDataFeed.injectPoints('economicZones', ECONOMIC_ZONES);
    
    // Inject military bases (hidden by default)
    // globeDataFeed.injectPoints('militaryBases', MILITARY_BASES);
    
    // Inject infrastructure (hidden by default)
    // const infraPoints = [...]
    // globeDataFeed.injectPoints('infrastructure', infraPoints);
    
    // Inject risk heat zones (hidden by default)
    // const conflictPoints = [...]
    // globeDataFeed.injectPoints('conflicts', conflictPoints);
  }, []);

  // Update visibility when props change
  useEffect(() => {
    // Update active layers in feed
    const activeLayers: GlobeLayer[] = [];
    if (visibility.tradeRoutes) activeLayers.push('tradeRoutes');
    if (visibility.economicZones) activeLayers.push('economicZones');
    if (visibility.infrastructure) activeLayers.push('infrastructure');
    if (visibility.militaryBases) activeLayers.push('militaryBases');
    if (visibility.riskHeatMap) activeLayers.push('conflicts');
    if (visibility.conflicts) activeLayers.push('conflicts');
    if (visibility.markets) activeLayers.push('markets');
    
    globeDataFeed.setActiveLayers(activeLayers);
    
    // Trigger re-render with new visibility
    const state = globeDataFeed.getState();
    updatePoints(state.points);
    updateArcs(state.arcs);
  }, [visibility, updatePoints, updateArcs]);

  return {
    layersGroup: layersGroupRef.current,
    dataFeed: globeDataFeed,
  };
}

// Component version for direct use (no-op, hook does the work)
export function StrategicGlobeLayers({ globeGroup, visibility }: StrategicGlobeLayersProps) {
  return null;
}
