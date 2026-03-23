// Tactical Lock-On Functions for NERV Globe
// Handles camera movements and target acquisition

import type { GlobeInstance } from './types';

export interface LockOnTarget {
  lat: number;
  lng: number;
  label: string;
  altitude?: number;
}

export interface TacticalOptions {
  transitionDuration?: number;
  searchDuration?: number;
  onStart?: () => void;
  onComplete?: () => void;
}

/**
 * Execute tactical lock-on to target coordinates
 * Mimics NERV command center target acquisition sequence
 */
export function tacticalLockOn(
  globe: GlobeInstance,
  target: LockOnTarget,
  options: TacticalOptions = {}
): void {
  const {
    transitionDuration = 2000,
    searchDuration = 2200,
    onStart,
    onComplete
  } = options;

  // 1. Trigger search state (NERV Orange atmosphere)
  globe.atmosphereColor('#FF9830');
  
  // Notify start
  onStart?.();

  // 2. Execute camera move to target
  globe.pointOfView({
    lat: target.lat,
    lng: target.lng,
    altitude: target.altitude ?? 1.5
  }, transitionDuration);

  // 3. Update HUD readout
  updateHUDReadout(`TARGET ACQUIRED: ${target.label.toUpperCase()}`, 'success');

  // 4. Revert atmosphere after lock
  setTimeout(() => {
    globe.atmosphereColor('#20F0FF'); // Back to Wire Cyan
    onComplete?.();
  }, searchDuration);
}

/**
 * Quick lock-on without search animation
 */
export function quickLockOn(
  globe: GlobeInstance,
  target: LockOnTarget,
  duration: number = 1000
): void {
  globe.pointOfView({
    lat: target.lat,
    lng: target.lng,
    altitude: target.altitude ?? 2.0
  }, duration);
}

/**
 * Reset globe to default view
 */
export function resetView(
  globe: GlobeInstance,
  duration: number = 1000
): void {
  globe.pointOfView({
    lat: 20,
    lng: 0,
    altitude: 2.5
  }, duration);
  
  updateHUDReadout('SCANNING...', 'neutral');
}

/**
 * Update the HUD readout display
 */
function updateHUDReadout(
  message: string,
  status: 'success' | 'neutral' | 'alert' = 'neutral'
): void {
  const hud = document.querySelector('.nerv-hud-readout');
  if (!hud) return;

  const colors = {
    success: '#50FF50', // Data Green
    neutral: '#20F0FF', // Wire Cyan
    alert: '#FF3030'    // Alert Red
  };

  hud.textContent = message;
  (hud as HTMLElement).style.color = colors[status];
}

// Category coordinate mappings for markets without specific locations
export const CATEGORY_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  'Geopolitics': { lat: 31.5, lng: 34.5, label: 'MIDDLE EAST' },
  'Crypto': { lat: 37.8, lng: -122.4, label: 'SAN FRANCISCO' },
  'AI/Tech': { lat: 47.6, lng: -122.3, label: 'SEATTLE' },
  'Macro': { lat: 40.7, lng: -74.0, label: 'NEW YORK' },
  'Biotech': { lat: 42.4, lng: -71.1, label: 'BOSTON' },
  'Commodities': { lat: 25.3, lng: 51.5, label: 'QATAR' },
  'UKR': { lat: 48.4, lng: 31.2, label: 'UKRAINE' },
  'PSE': { lat: 31.9, lng: 35.2, label: 'PALESTINE' },
  'TWN': { lat: 23.7, lng: 121.0, label: 'TAIWAN' },
  'CHN': { lat: 35.8, lng: 104.1, label: 'CHINA' },
  'RUS': { lat: 61.5, lng: 105.3, label: 'RUSSIA' },
  'ISR': { lat: 31.0, lng: 34.8, label: 'ISRAEL' },
};

/**
 * Get coordinates for a category or region code
 */
export function getCategoryCoords(category?: string): { lat: number; lng: number; label: string } | null {
  if (!category) return null;
  return CATEGORY_COORDS[category] || null;
}
