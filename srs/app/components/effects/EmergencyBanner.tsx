/**
 * EmergencyBanner - Full-width emergency banner
 * Matches the reference: red bar with Japanese text
 */

export function EmergencyBanner() {
  return (
    <div
      className="emergency-banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '28px',
        background: 'var(--alert-red)',
        color: 'var(--void)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        zIndex: 10000,
        transform: 'translateY(-100%)',
        transition: 'transform 0.3s ease',
      }}
    >
      <span
        style={{
          fontFamily: "'Saira Extra Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '14px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
        }}
      >
        ▲ Emergency
      </span>
      <span
        style={{
          fontFamily: "'Shippori Mincho B1', serif",
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.2em',
        }}
      >
        緊急事態
      </span>
      <span
        style={{
          fontFamily: "'Saira Extra Condensed', sans-serif",
          fontWeight: 800,
          fontSize: '14px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
        }}
      >
        MAGI Conflict Detected ▲
      </span>
    </div>
  );
}

export function EmergencyBannerStyles() {
  return (
    <style>{`
      html[data-mode="emergency"] .emergency-banner {
        transform: translateY(0) !important;
        animation: emergency-blink 1.5s infinite;
      }

      @keyframes emergency-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.85; }
      }

      html[data-mode="emergency"] body {
        padding-top: 28px;
      }
    `}</style>
  );
}
