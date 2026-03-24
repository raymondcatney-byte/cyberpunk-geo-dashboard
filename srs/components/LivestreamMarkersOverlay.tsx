import { useState, useCallback } from 'react';
import { LIVESTREAMS } from '../config/livestreams';

interface MarkerPosition {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

interface LivestreamMarkersOverlayProps {
  positions: MarkerPosition[];
  selectedMarkerId: string | null;
  onMarkerSelect: (id: string | null) => void;
  onMarkerDoubleClick: (id: string) => void;
  showMarkers: boolean;
}

export function LivestreamMarkersOverlay({
  positions,
  selectedMarkerId,
  onMarkerSelect,
  onMarkerDoubleClick,
  showMarkers,
}: LivestreamMarkersOverlayProps) {
  const [lastClickTime, setLastClickTime] = useState<Record<string, number>>({});

  const handleMarkerClick = useCallback((id: string) => {
    const now = Date.now();
    const lastClick = lastClickTime[id] || 0;
    const timeDiff = now - lastClick;
    
    if (selectedMarkerId === id && timeDiff < 500) {
      // Double click on same marker - open livestream
      onMarkerDoubleClick(id);
    } else {
      // First click or click on different marker - select it
      onMarkerSelect(id);
    }
    
    setLastClickTime(prev => ({ ...prev, [id]: now }));
  }, [selectedMarkerId, onMarkerSelect, onMarkerDoubleClick, lastClickTime]);

  if (!showMarkers) return null;

  return (
    <>
      {/* Clickable overlay buttons */}
      {positions.map((pos) => {
        if (!pos.visible) return null;
        
        const isSelected = selectedMarkerId === pos.id;
        const stream = LIVESTREAMS.find(s => s.id === pos.id);
        
        return (
          <button
            key={pos.id}
            onClick={() => handleMarkerClick(pos.id)}
            className={`
              absolute z-30 w-8 h-8 -translate-x-1/2 -translate-y-1/2
              rounded-full cursor-pointer transition-all duration-200
            `}
            style={{
              left: pos.x,
              top: pos.y,
              backgroundColor: isSelected ? 'rgba(255, 51, 51, 0.4)' : 'transparent',
              border: `2px solid ${isSelected ? 'rgb(255, 51, 51)' : 'rgba(255, 51, 51, 0.6)'}`,
              boxShadow: isSelected ? '0 0 15px rgba(255, 51, 51, 0.8)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'rgba(255, 51, 51, 0.2)';
                e.currentTarget.style.borderColor = 'rgb(255, 51, 51)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 51, 51, 0.6)';
              }
            }}
            title={stream ? `${stream.city}, ${stream.country}` : ''}
          />
        );
      })}
      
      {/* City label for selected marker */}
      {selectedMarkerId && positions.find(p => p.id === selectedMarkerId)?.visible && (
        (() => {
          const pos = positions.find(p => p.id === selectedMarkerId);
          const stream = LIVESTREAMS.find(s => s.id === selectedMarkerId);
          if (!pos || !stream) return null;
          
          return (
            <div
              className="absolute z-40 px-3 py-1 bg-black/90 font-mono text-xs uppercase tracking-wider pointer-events-none"
              style={{
                left: pos.x,
                top: pos.y - 30,
                transform: 'translateX(-50%)',
                border: '1px solid rgb(255, 51, 51)',
                color: 'rgb(255, 51, 51)',
              }}
            >
              {stream.city}, {stream.country}
            </div>
          );
        })()
      )}
    </>
  );
}
