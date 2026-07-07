'use client';

import { useCallback, useEffect, useState } from 'react';
import { MarketMeta, MarketChainState, fetchMarketChainState } from './betContract';

export interface MarketWithState {
  meta: MarketMeta;
  state: MarketChainState | null;
}

export function useMarkets() {
  const [markets, setMarkets] = useState<MarketWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/markets');
      if (!res.ok) throw new Error('failed to load markets');
      const data = await res.json();
      const metas: MarketMeta[] = data.markets || [];
      const withState = await Promise.all(
        metas.map(async (meta) => ({
          meta,
          state: await fetchMarketChainState(meta.ncId).catch(() => null),
        }))
      );
      setMarkets(withState);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'failed to load markets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { markets, loading, error, refresh };
}

export function useMarket(ncId: string | null) {
  const [meta, setMeta] = useState<MarketMeta | null>(null);
  const [state, setState] = useState<MarketChainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ncId) return;
    try {
      const [metaRes, chainState] = await Promise.all([
        fetch(`/api/markets/${ncId}`),
        fetchMarketChainState(ncId),
      ]);
      if (metaRes.ok) {
        const data = await metaRes.json();
        setMeta(data.market);
      } else if (metaRes.status === 404) {
        setError('market not found');
      }
      setState(chainState);
    } catch (err: any) {
      setError(err?.message || 'failed to load market');
    } finally {
      setLoading(false);
    }
  }, [ncId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { meta, state, loading, error, refresh };
}
