/**
 * CRTEffects - NERV MAGI Terminal Visual Effects
 * Scanlines, vignette, phosphor flicker, animated scan line
 */

export function CRTEffects() {
  return (
    <>
      {/* Scanlines: Horizontal lines, 4px interval, 4% opacity */}
      <div
        className="fixed inset-0 pointer-events-none z-[9998]"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          backgroundSize: '100% 4px',
          opacity: 0.04,
        }}
        aria-hidden="true"
      />

      {/* Phosphor flicker: Subtle opacity jitter */}
      <div
        className="fixed inset-0 pointer-events-none z-[9997]"
        style={{
          animation: 'phosphor-flicker 4s infinite',
          background: 'rgba(0,0,0,0.02)',
        }}
        aria-hidden="true"
      />

      {/* Vignette: Radial gradient to black edges */}
      <div
        className="fixed inset-0 pointer-events-none z-[9996]"
        style={{
          background: 'radial-gradient(circle at center, transparent 50%, rgba(0,0,0,0.4) 100%)',
        }}
        aria-hidden="true"
      />

      {/* Animated scan line: Sweeping horizontal beam */}
      <div className="fixed inset-0 pointer-events-none z-[9995] overflow-hidden" aria-hidden="true">
        <ScanLine />
      </div>

      {/* Emergency pulse overlay (only visible in emergency mode) */}
      <EmergencyPulse />
    </>
  );
}

function ScanLine() {
  // Use CSS custom property for color to respond to emergency mode
  return (
    <div
      className="absolute left-0 right-0 h-[2px] scan-line-beam"
      style={{
        animation: 'scanline-move 8s linear infinite',
        background: 'var(--scanline-color, rgba(80, 255, 80, 0.15))',
        boxShadow: '0 0 10px var(--scanline-glow, rgba(80, 255, 80, 0.3))',
      }}
    />
  );
}

function EmergencyPulse() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[9994] emergency-pulse-overlay"
      style={{
        background: 'var(--alert-red)',
        opacity: 0,
        animation: 'emergency-pulse 2s infinite',
      }}
      aria-hidden="true"
    />
  );
}

// Inject keyframes that respond to data-mode
export function CRTStyles() {
  return (
    <style>{`
      @keyframes phosphor-flicker {
        0%, 100% { opacity: 0.98; }
        50% { opacity: 1; }
        75% { opacity: 0.97; }
      }

      @keyframes scanline-move {
        0% { transform: translateY(-10%); }
        100% { transform: translateY(110vh); }
      }

      @keyframes emergency-pulse {
        0%, 100% { opacity: 0; }
        50% { opacity: 0.03; }
      }

      /* Normal mode colors */
      :root {
        --scanline-color: rgba(80, 255, 80, 0.15);
        --scanline-glow: rgba(80, 255, 80, 0.3);
      }

      /* Emergency mode - speed up scanline, change color */
      html[data-mode="emergency"] .scan-line-beam {
        animation-duration: 2s !important;
        --scanline-color: rgba(255, 48, 48, 0.25);
        --scanline-glow: rgba(255, 48, 48, 0.5);
      }

      html[data-mode="emergency"] .emergency-pulse-overlay {
        opacity: 0.02;
      }

      /* Reduced motion respect */
      @media (prefers-reduced-motion: reduce) {
        .scan-line-beam,
        .emergency-pulse-overlay {
          animation: none !important;
        }
      }
    `}</style>
  );
}
