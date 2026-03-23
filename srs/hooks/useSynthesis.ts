import { useMemo } from 'react';
import { useTradingSnapshot } from './useTradingSnapshot';
import { buildBruceContext, buildMakaveliContext, synthesizeSnapshot } from '../lib/synthesis-engine';

export function useSynthesis(enabled: boolean = true, refreshMs: number = 60_000) {
  const { snapshot, loading, error, refresh } = useTradingSnapshot(enabled, refreshMs);

  const synthesis = useMemo(() => synthesizeSnapshot(snapshot), [snapshot]);
  const bruceContext = useMemo(() => buildBruceContext(synthesis), [synthesis]);
  const makaveliContext = useMemo(() => buildMakaveliContext(synthesis), [synthesis]);

  return {
    snapshot,
    synthesis,
    bruceContext,
    makaveliContext,
    loading,
    error,
    refresh,
  };
}