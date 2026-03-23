import { useEffect } from 'react';
import { globeDataFeed } from '../services/globeDataFeed';
import { TRADE_ROUTES } from '../services/globeLayerService';

/**
 * Initialize trade routes on the globe
 * Called once on War Room mount
 */
export function useTradeRoutes() {
  useEffect(() => {
    // Convert trade routes to arcs
    const arcs = Object.values(TRADE_ROUTES).flatMap(route => {
      // Create arcs between consecutive points in the path
      const pathArcs = [];
      for (let i = 0; i < route.path.length - 1; i++) {
        pathArcs.push({
          id: `${route.name}-${i}`,
          from: route.path[i],
          to: route.path[i + 1],
          color: '#ffb84d', // Amber
          width: route.importance === 'critical' ? 2 : 1,
          animated: true,
          volume: route.importance === 'critical' ? 100 : 50,
          label: route.name,
          throughput: route.throughput,
        });
      }
      return pathArcs;
    });

    // Inject into data feed
    globeDataFeed.injectArcs(arcs);
  }, []);
}
