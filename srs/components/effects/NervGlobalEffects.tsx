import { useEffect, useState } from 'react';

export function NervGlobalEffects() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Hexagon Grid Background */}
      <div className="nerv-hexgrid" aria-hidden="true" />
      
      {/* Scanline Overlay */}
      <div className="nerv-scanline-overlay" aria-hidden="true" />
    </>
  );
}

export default NervGlobalEffects;
