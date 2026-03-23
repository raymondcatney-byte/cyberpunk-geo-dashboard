// MAGI Integration Hook for NERV Tactical Globe
// Connects MAGI consensus state to globe visual effects

import { useState, useCallback, useEffect } from 'react';
import type { AtmosphereState } from '../lib/globe/nervGrid';

interface MagiGlobeState {
  atmosphereState: AtmosphereState;
  setAtmosphereState: (state: AtmosphereState) => void;
  triggerEmergency: () => void;
  clearEmergency: () => void;
  isEmergency: boolean;
}

/**
 * Hook to manage MAGI integration with the tactical globe
 */
export function useGlobeMagi(): MagiGlobeState {
  const [atmosphereState, setAtmosphereState] = useState<AtmosphereState>('nominal');
  const [isEmergency, setIsEmergency] = useState(false);

  // Trigger emergency mode (Pattern Blue)
  const triggerEmergency = useCallback(() => {
    setAtmosphereState('emergency');
    setIsEmergency(true);
    document.documentElement.setAttribute('data-mode', 'emergency');
  }, []);

  // Clear emergency mode
  const clearEmergency = useCallback(() => {
    setAtmosphereState('nominal');
    setIsEmergency(false);
    document.documentElement.setAttribute('data-mode', 'nominal');
  }, []);

  // Listen for MAGI consensus changes from window events
  useEffect(() => {
    const handleMagiConsensus = (e: CustomEvent<'UNANIMOUS' | 'MAJORITY' | 'SPLIT' | 'DISSENT'>) => {
      const consensus = e.detail;
      
      switch (consensus) {
        case 'UNANIMOUS':
        case 'MAJORITY':
          setAtmosphereState('nominal');
          setIsEmergency(false);
          document.documentElement.setAttribute('data-mode', 'nominal');
          break;
        case 'SPLIT':
          setAtmosphereState('caution');
          setIsEmergency(false);
          document.documentElement.setAttribute('data-mode', 'nominal');
          break;
        case 'DISSENT':
          setAtmosphereState('emergency');
          setIsEmergency(true);
          document.documentElement.setAttribute('data-mode', 'emergency');
          break;
      }
    };

    const handleEmergencyMode = (e: CustomEvent<boolean>) => {
      if (e.detail) {
        triggerEmergency();
      } else {
        clearEmergency();
      }
    };

    window.addEventListener('magi-consensus-change', handleMagiConsensus as EventListener);
    window.addEventListener('emergency-mode', handleEmergencyMode as EventListener);

    return () => {
      window.removeEventListener('magi-consensus-change', handleMagiConsensus as EventListener);
      window.removeEventListener('emergency-mode', handleEmergencyMode as EventListener);
    };
  }, [triggerEmergency, clearEmergency]);

  return {
    atmosphereState,
    setAtmosphereState,
    triggerEmergency,
    clearEmergency,
    isEmergency
  };
}

/**
 * Dispatch MAGI consensus change event
 */
export function dispatchMagiConsensus(consensus: 'UNANIMOUS' | 'MAJORITY' | 'SPLIT' | 'DISSENT'): void {
  window.dispatchEvent(new CustomEvent('magi-consensus-change', { detail: consensus }));
}

/**
 * Dispatch emergency mode event
 */
export function dispatchEmergencyMode(isEmergency: boolean): void {
  window.dispatchEvent(new CustomEvent('emergency-mode', { detail: isEmergency }));
}
