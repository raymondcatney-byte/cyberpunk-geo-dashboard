import * as THREE from 'three';
import type { AircraftState } from '../../lib/flightTracking';

// Reusable geometry/materials (create once)
// Using amber instead of cyan to match UI theme and reduce visual noise
const AIRCRAFT_COLOR_AMBER = 0xFFB800;
const AIRCRAFT_COLOR_GROUND = 0x666666;

const aircraftGeo = new THREE.PlaneGeometry(0.4, 0.4);
const aircraftMatInFlight = new THREE.MeshBasicMaterial({ 
  color: AIRCRAFT_COLOR_AMBER, 
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.9
});
const aircraftMatGround = new THREE.MeshBasicMaterial({ 
  color: AIRCRAFT_COLOR_GROUND, 
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.5
});

const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
const glowMat = new THREE.MeshBasicMaterial({ 
  color: AIRCRAFT_COLOR_AMBER,
  transparent: true,
  opacity: 0.3
});

interface AircraftMarker {
  id: string;
  mesh: THREE.Mesh;
  glow?: THREE.Mesh;
  data: AircraftState;
}

export class MarkerManager {
  private markers = new Map<string, AircraftMarker>();
  private scene: THREE.Scene;
  private aircraftGroup: THREE.Group;
  private globeRadius: number;

  constructor(scene: THREE.Scene, globeRadius: number = 6.15) {
    this.scene = scene;
    this.globeRadius = globeRadius;
    this.aircraftGroup = new THREE.Group();
    scene.add(this.aircraftGroup);
  }

  latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  updateAircraft(aircraft: AircraftState[]) {
    const currentIds = new Set<string>();
    
    aircraft.forEach(ac => {
      currentIds.add(ac.icao24);
      const existing = this.markers.get(ac.icao24);
      
      // Altitude affects height above globe
      const altitudeOffset = Math.min(ac.altitude / 8000, 1.5);
      const pos = this.latLngToVector3(
        ac.latitude, 
        ac.longitude, 
        this.globeRadius + altitudeOffset
      );
      
      if (existing) {
        // Update existing marker
        existing.mesh.position.copy(pos);
        existing.mesh.lookAt(0, 0, 0);
        existing.mesh.rotateZ((ac.heading * Math.PI) / 180);
        existing.mesh.rotateX(Math.PI / 2);
        
        // Update material if ground status changed
        const targetMat = ac.on_ground ? aircraftMatGround : aircraftMatInFlight;
        if (existing.mesh.material !== targetMat) {
          existing.mesh.material = targetMat;
        }
        
        // Update glow visibility
        if (existing.glow) {
          existing.glow.visible = !ac.on_ground;
          if (!ac.on_ground) {
            existing.glow.position.copy(pos);
          }
        }
        
        existing.data = ac;
      } else {
        // Create new marker
        const material = ac.on_ground ? aircraftMatGround.clone() : aircraftMatInFlight.clone();
        const mesh = new THREE.Mesh(aircraftGeo, material);
        mesh.position.copy(pos);
        mesh.lookAt(0, 0, 0);
        mesh.rotateZ((ac.heading * Math.PI) / 180);
        mesh.rotateX(Math.PI / 2);
        mesh.userData = { 
          id: ac.icao24, 
          type: 'aircraft', 
          data: ac 
        };
        
        this.aircraftGroup.add(mesh);
        
        // Add glow for in-flight aircraft
        let glow: THREE.Mesh | undefined;
        if (!ac.on_ground) {
          glow = new THREE.Mesh(glowGeo, glowMat.clone());
          glow.position.copy(pos);
          this.aircraftGroup.add(glow);
        }
        
        this.markers.set(ac.icao24, { 
          id: ac.icao24, 
          mesh, 
          glow,
          data: ac 
        });
      }
    });

    // Remove stale markers
    this.markers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        this.aircraftGroup.remove(marker.mesh);
        if (marker.glow) {
          this.aircraftGroup.remove(marker.glow);
        }
        // Don't dispose shared geometry, just the material clone
        if (marker.mesh.material !== aircraftMatInFlight && 
            marker.mesh.material !== aircraftMatGround) {
          (marker.mesh.material as THREE.Material).dispose();
        }
        this.markers.delete(id);
      }
    });
  }

  getIntersects(raycaster: THREE.Raycaster): AircraftState | null {
    const intersects = raycaster.intersectObjects(this.aircraftGroup.children);
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      return obj.userData?.data as AircraftState || null;
    }
    return null;
  }

  dispose() {
    this.markers.forEach(marker => {
      this.aircraftGroup.remove(marker.mesh);
      if (marker.glow) {
        this.aircraftGroup.remove(marker.glow);
      }
      // Dispose only cloned materials
      if (marker.mesh.material !== aircraftMatInFlight && 
          marker.mesh.material !== aircraftMatGround) {
        (marker.mesh.material as THREE.Material).dispose();
      }
      if (marker.glow?.material !== glowMat) {
        marker.glow?.material?.dispose();
      }
    });
    this.markers.clear();
    this.scene.remove(this.aircraftGroup);
  }
}
