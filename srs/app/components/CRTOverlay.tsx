// CRT Phosphor Display Effect - Subtle Scanlines
// Creates a gentle cathode-ray tube aesthetic without overwhelming the UI

export function CRTOverlay() {
  return (
    <div 
      className="crt-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: `
          linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.08) 50%),
          linear-gradient(90deg, rgba(255, 0, 0, 0.015), rgba(0, 255, 0, 0.005), rgba(0, 0, 255, 0.015))
        `,
        backgroundSize: '100% 4px, 3px 100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
