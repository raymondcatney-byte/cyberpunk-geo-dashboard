// Hex globe utilities - math for spherical hex grid
import * as THREE from 'three';
import type { HexCell, CityMarker } from '../types/globe';

// Fibonacci sphere for even point distribution on sphere
export function getFibonacciSpherePoints(n: number, radius: number): { x: number; y: number; z: number; lat: number; lng: number }[] {
  const points: { x: number; y: number; z: number; lat: number; lng: number }[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle
  
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    
    // Convert to lat/lng for data mapping
    const lat = Math.asin(y) * (180 / Math.PI);
    const lng = Math.atan2(z, x) * (180 / Math.PI);
    
    points.push({ x: x * radius, y: y * radius, z: z * radius, lat, lng });
  }
  
  return points;
}

// Convert lat/lng to Vector3
export function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Create hexagon shape for extrusion
export function createHexagonShape(size: number): THREE.Shape {
  const shape = new THREE.Shape();
  const sides = 6;
  
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    const x = Math.cos(angle) * size;
    const y = Math.sin(angle) * size;
    
    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  
  shape.closePath();
  return shape;
}

// Get color based on intensity (0-1)
export function getHeatmapColor(intensity: number): THREE.Color {
  // Gradient: dark brown -> orange -> red -> white
  const color = new THREE.Color();
  
  if (intensity < 0.25) {
    // Dark brown to nerv-orange
    const t = intensity / 0.25;
    color.setHex(0x1a0f00); // Dark brown base
    color.lerp(new THREE.Color(0xe8a03c), t); // Nerv orange
  } else if (intensity < 0.5) {
    // Nerv-orange to bright orange
    const t = (intensity - 0.25) / 0.25;
    color.setHex(0xe8a03c);
    color.lerp(new THREE.Color(0xff6600), t);
  } else if (intensity < 0.75) {
    // Bright orange to red
    const t = (intensity - 0.5) / 0.25;
    color.setHex(0xff6600);
    color.lerp(new THREE.Color(0xff0040), t);
  } else {
    // Red to white
    const t = (intensity - 0.75) / 0.25;
    color.setHex(0xff0040);
    color.lerp(new THREE.Color(0xffffff), t);
  }
  
  return color;
}

// Calculate distance between two lat/lng points (Haversine formula)
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Assign market data to nearest hex cells and cities
export function assignMarketData(
  hexCells: HexCell[],
  cities: CityMarker[],
  markets: Array<{ category?: string; volume?: number; question?: string; slug?: string; url?: string }>
): { cells: HexCell[]; cityMarkers: CityMarker[] } {
  // Reset intensities
  const updatedCells = hexCells.map(cell => ({ ...cell, intensity: 0, marketCount: 0, volume: 0 }));
  const updatedCities = cities.map(city => ({ ...city, volume: 0, marketCount: 0 }));
  
  // Regional market mapping (simplified - based on keywords in question)
  const regionKeywords: Record<string, string[]> = {
    'North America': ['us', 'usa', 'united states', 'america', 'canada', 'mexico', 'federal reserve', 'fed', 'sec', 'nasdaq', 'nyse'],
    'Europe': ['eu', 'europe', 'uk', 'united kingdom', 'germany', 'france', 'ecb', 'european central bank', 'brexit'],
    'Asia': ['china', 'japan', 'korea', 'india', 'asia', 'hong kong', 'shanghai', 'tokyo', 'beijing'],
    'Middle East': ['israel', 'gaza', 'iran', 'saudi', 'middle east', 'dubai', 'uae', 'opec'],
    'South America': ['brazil', 'argentina', 'venezuela', 'south america', 'brics'],
    'Oceania': ['australia', 'new zealand', 'sydney', 'melbourne'],
    'Africa': ['africa', 'nigeria', 'south africa', 'egypt'],
  };
  
  // Calculate total volume for normalization
  let totalVolume = 0;
  markets.forEach(market => {
    totalVolume += market.volume || 0;
  });
  
  // Assign markets to regions based on keywords
  markets.forEach(market => {
    const question = (market.question || '').toLowerCase();
    const volume = market.volume || 0;
    
    let matchedRegion = 'Unknown';
    for (const [region, keywords] of Object.entries(regionKeywords)) {
      if (keywords.some(kw => question.includes(kw))) {
        matchedRegion = region;
        break;
      }
    }
    
    // Update cells in that region
    updatedCells.forEach(cell => {
      if (cell.region === matchedRegion || (matchedRegion === 'Unknown' && Math.random() > 0.7)) {
        cell.marketCount += 1;
        cell.volume += volume;
      }
    });
    
    // Update nearest city
    let nearestCity: CityMarker | null = null;
    let minDistance = Infinity;
    
    updatedCities.forEach(city => {
      // Simple keyword matching for city assignment
      const cityKeywords: Record<string, string[]> = {
        'New York': ['fed', 'federal reserve', 'sec', 'nasdaq', 'nyse', 'biden', 'trump', 'us election', 'america'],
        'London': ['uk', 'britain', 'england', 'london', 'bank of england', 'brexit'],
        'Tokyo': ['japan', 'tokyo', 'bank of japan', 'nikkei'],
        'Singapore': ['singapore', 'southeast asia'],
        'Dubai': ['uae', 'dubai', 'emirates'],
        'Hong Kong': ['hong kong', 'hkex'],
        'Sydney': ['australia', 'sydney', 'rba'],
        'São Paulo': ['brazil', 'brics', 'south america'],
        'Zurich': ['switzerland', 'swiss', 'zurich'],
        'Mumbai': ['india', 'mumbai', 'rbi'],
        'Toronto': ['canada', 'toronto', 'tsx'],
        'Frankfurt': ['germany', 'ecb', 'european central bank', 'frankfurt'],
      };
      
      const cityKws = cityKeywords[city.name] || [];
      if (cityKws.some(kw => question.includes(kw))) {
        city.marketCount += 1;
        city.volume += volume;
      }
    });
  });
  
  // Calculate intensity based on volume relative to max
  const maxVolume = Math.max(...updatedCells.map(c => c.volume), 1);
  updatedCells.forEach(cell => {
    cell.intensity = Math.min(1, (cell.volume / maxVolume) * 2 + (cell.marketCount > 0 ? 0.1 : 0));
  });
  
  // Normalize city volumes
  const maxCityVolume = Math.max(...updatedCities.map(c => c.volume), 1);
  updatedCities.forEach(city => {
    city.volume = city.volume / maxCityVolume;
  });
  
  return { cells: updatedCells, cityMarkers: updatedCities };
}

// Assign cells to regions based on latitude
export function assignCellRegions(cells: Omit<HexCell, 'region'>[]): HexCell[] {
  return cells.map(cell => {
    let region = 'Unknown';
    const lat = cell.lat;
    const lng = cell.lng;
    
    // Rough regional boundaries
    if (lng > -130 && lng < -60 && lat > 15 && lat < 75) {
      region = 'North America';
    } else if (lng > -10 && lng < 40 && lat > 35 && lat < 75) {
      region = 'Europe';
    } else if (lng > 60 && lng < 150 && lat > -10 && lat < 50) {
      region = 'Asia';
    } else if (lng > 30 && lng < 60 && lat > 10 && lat < 45) {
      region = 'Middle East';
    } else if (lng > -85 && lng < -35 && lat > -60 && lat < 15) {
      region = 'South America';
    } else if (lng > 110 && lng < 180 && lat > -50 && lat < -10) {
      region = 'Oceania';
    } else if (lng > -20 && lng < 55 && lat > -35 && lat < 35) {
      region = 'Africa';
    }
    
    return { ...cell, region };
  });
}
