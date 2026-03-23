import { useEffect } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';
import { useSynthesis } from './useSynthesis';

const REGION_MAP: Record<string, { lat: number; lng: number; category: string }> = {
  china: { lat: 35.8617, lng: 104.1954, category: 'asia' },
  taiwan: { lat: 23.6978, lng: 120.9605, category: 'asia' },
  iran: { lat: 32.4279, lng: 53.688, category: 'energy' },
  ukraine: { lat: 48.3794, lng: 31.1656, category: 'conflict' },
  russia: { lat: 61.524, lng: 105.3188, category: 'conflict' },
  israel: { lat: 31.0461, lng: 34.8516, category: 'conflict' },
  gaza: { lat: 31.5017, lng: 34.4668, category: 'conflict' },
  turkey: { lat: 38.9637, lng: 35.2433, category: 'chokepoint' },
  canada: { lat: 56.1304, lng: -106.3468, category: 'resources' },
  greenland: { lat: 71.7069, lng: -42.6043, category: 'arctic' },
  arctic: { lat: 74, lng: -40, category: 'arctic' },
  energy: { lat: 29.5, lng: 47.75, category: 'energy' },
};

function locate(title: string) {
  const lowered = title.toLowerCase();
  for (const [keyword, region] of Object.entries(REGION_MAP)) {
    if (lowered.includes(keyword)) return region;
  }
  return null;
}

export function useStrategicGlobeIntel(enabled: boolean = true) {
  const { snapshot, synthesis } = useSynthesis(enabled, 90_000);

  useEffect(() => {
    if (!enabled || !snapshot) return;

    const marketSignals = synthesis.opportunities
      .filter((opportunity) => opportunity.domain === 'prediction_market')
      .map((opportunity, index) => {
        const region = locate(opportunity.title);
        if (!region) return null;
        return {
          id: `strategic-market-${opportunity.id}`,
          lat: region.lat + index * 0.4,
          lng: region.lng + index * 0.35,
          layer: 'markets' as const,
          timestamp: Date.now(),
          color: opportunity.edge >= 0 ? '#22c55e' : '#f97316',
          size: 0.18,
          opacity: 0.85,
          pulse: Math.abs(opportunity.edge) > 0.08,
          title: opportunity.title,
          description: `market edge ${(opportunity.edge * 100).toFixed(1)}% | ${opportunity.confidence}% confidence`,
          category: `strategic-${region.category}`,
          severity: Math.abs(opportunity.edge) > 0.1 ? 'high' as const : 'medium' as const,
          makaveliQuery: `Analyze the strategic region behind this market: ${opportunity.title}`,
          externalUrl: undefined,
        };
      })
      .filter(Boolean);

    const infrastructureSignals = synthesis.geopoliticalSignals.slice(0, 5).map((item, index) => {
      const region = locate(item.title);
      return {
        id: `strategic-feed-${item.id}`,
        lat: region?.lat ?? 40 + index * 4,
        lng: region?.lng ?? -20 + index * 18,
        layer: 'infrastructure' as const,
        timestamp: Date.now(),
        color: '#00d4ff',
        size: 0.14,
        opacity: 0.7,
        pulse: index === 0 || item.confidence === 'high',
        title: item.title,
        description: `${item.source} | geopolitical pressure signal`,
        category: 'intel-confirmation',
        severity: item.confidence === 'high' ? 'high' as const : 'medium' as const,
        makaveliQuery: `Connect this strategic feed to current market pricing: ${item.title}`,
        externalUrl: item.url,
      };
    });

    const energySignals = snapshot.energy
      .filter((signal) => signal.lat != null && signal.lng != null)
      .slice(0, 5)
      .map((signal, index) => ({
        id: `strategic-energy-${signal.id}`,
        lat: (signal.lat || 0) + index * 0.25,
        lng: (signal.lng || 0) + index * 0.25,
        layer: 'infrastructure' as const,
        timestamp: Date.now(),
        color: signal.stressScore >= 64 ? '#f97316' : '#22c55e',
        size: 0.18,
        opacity: 0.78,
        pulse: signal.stressScore >= 70,
        title: `${signal.regionCode} grid stress`,
        description: `${signal.summary} Stress ${signal.stressScore.toFixed(0)}.`,
        category: 'energy-grid',
        severity: signal.stressScore >= 70 ? 'high' as const : 'medium' as const,
        makaveliQuery: `Assess the strategic implications of ${signal.region} grid stress for energy and market pricing.`,
        externalUrl: undefined,
      }));

    const existingMarketPoints = globeDataFeed
      .getState()
      .points
      .filter((point) => point.layer === 'markets' && !point.id.startsWith('strategic-market-'));

    globeDataFeed.injectPoints('markets', [...existingMarketPoints, ...marketSignals]);
    globeDataFeed.injectPoints('infrastructure', [...infrastructureSignals, ...energySignals]);
  }, [enabled, snapshot, synthesis]);
}