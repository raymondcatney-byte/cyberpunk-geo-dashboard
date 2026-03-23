import { useState, useEffect } from 'react';
import { correlationEngine, type CorrelationAlert } from '../services/correlationEngine';

interface UseCorrelationAlertsOptions {
  onCriticalAlert?: (alert: CorrelationAlert) => void;
}

/**
 * React hook for correlation alerts
 * Subscribes to the correlation engine and provides alerts to components
 */
export function useCorrelationAlerts(options: UseCorrelationAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<CorrelationAlert[]>([]);
  const [criticalCount, setCriticalCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  
  useEffect(() => {
    // Subscribe to correlation engine
    const unsubscribe = correlationEngine.subscribe((newAlerts) => {
      setAlerts(newAlerts);
      
      const critical = newAlerts.filter(a => a.severity === 'critical').length;
      const high = newAlerts.filter(a => a.severity === 'high').length;
      
      setCriticalCount(critical);
      setHighCount(high);
      
      // Trigger callback for new critical alerts
      if (options.onCriticalAlert && critical > 0) {
        const latestCritical = newAlerts.find(a => a.severity === 'critical');
        if (latestCritical) {
          options.onCriticalAlert(latestCritical);
        }
      }
    });
    
    return unsubscribe;
  }, [options.onCriticalAlert]);
  
  return {
    alerts,
    criticalCount,
    highCount,
    totalCount: alerts.length,
    hasCritical: criticalCount > 0,
    hasHigh: highCount > 0,
  };
}
