// Custom shaders for the globe - NERV/Sentinel aesthetic

// Atmosphere shader with orange glow
export const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ATMOSPHERE_FRAGMENT_SHADER = `
  varying vec3 vNormal;
  uniform vec3 color;
  uniform float intensity;
  
  void main() {
    float glow = pow(0.7 - dot(vNormal, vec3(0, 0, 1.0)), 2.0);
    gl_FragColor = vec4(color, glow * intensity);
  }
`;

// Hex grid shader for heatmap visualization
export const HEX_GRID_VERTEX_SHADER = `
  attribute float value;
  varying float vValue;
  varying vec3 vPosition;
  
  void main() {
    vValue = value;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const HEX_GRID_FRAGMENT_SHADER = `
  varying float vValue;
  varying vec3 vPosition;
  uniform vec3 colorLow;
  uniform vec3 colorHigh;
  uniform float opacity;
  
  void main() {
    vec3 color = mix(colorLow, colorHigh, vValue);
    gl_FragColor = vec4(color, opacity);
  }
`;

// Pulse marker shader for focal points
export const PULSE_MARKER_VERTEX_SHADER = `
  attribute float time;
  attribute float size;
  varying float vTime;
  varying float vAlpha;
  
  void main() {
    vTime = time;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = 1.0 - smoothstep(0.0, 1.0, time);
  }
`;

export const PULSE_MARKER_FRAGMENT_SHADER = `
  varying float vTime;
  varying float vAlpha;
  uniform vec3 color;
  uniform vec3 pulseColor;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float inner = 1.0 - smoothstep(0.0, 0.3, dist);
    float outer = 1.0 - smoothstep(0.3, 0.5, dist);
    
    vec3 finalColor = mix(color, pulseColor, vTime);
    float alpha = (inner + outer * vAlpha * 0.5) * outer;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// Arc shader for connection lines
export const ARC_VERTEX_SHADER = `
  attribute float progress;
  varying float vProgress;
  
  void main() {
    vProgress = progress;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ARC_FRAGMENT_SHADER = `
  varying float vProgress;
  uniform vec3 color;
  uniform float dashSize;
  uniform float gapSize;
  
  void main() {
    float pattern = mod(vProgress * (dashSize + gapSize), dashSize + gapSize);
    float alpha = pattern < dashSize ? 1.0 : 0.0;
    gl_FragColor = vec4(color, alpha * 0.8);
  }
`;

// Shader uniform defaults
export const SHADER_DEFAULTS = {
  atmosphere: {
    color: [1.0, 0.42, 0.0], // NERV orange
    intensity: 1.2,
  },
  hexGrid: {
    colorLow: [0.1, 0.1, 0.18],
    colorHigh: [0.91, 0.27, 0.38],
    opacity: 0.6,
  },
  pulseMarker: {
    color: [1.0, 0.42, 0.0],
    pulseColor: [1.0, 0.67, 0.0],
  },
  arc: {
    color: [0.0, 0.83, 1.0],
    dashSize: 0.1,
    gapSize: 0.05,
  },
};
