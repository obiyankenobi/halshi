'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketMeta, getMaxWithdrawal } from './betContract';

export interface Claimable {
  market: MarketMeta;
  amount: bigint; // cents still withdrawable
}

const POLL_INTERVAL_MS = 60_000;

// seen: amounts already counted by the badge (reset by opening the bell).
// dismissed: entries the user cleared from the panel; they stay hidden until
// claimed (the sweep stops finding them) or the amount changes.
// claimables: cache of the last sweep result so pages that don't sweep
// (everything except the homepage) can still show the bell.
function storageKey(kind: 'seen' | 'dismissed' | 'claimables', address: string): string {
  return `halshi_${kind}_rewards:${address}`;
}

function loadMap(kind: 'seen' | 'dismissed', address: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(kind, address)) || '{}');
  } catch {
    return {};
  }
}

function saveMap(kind: 'seen' | 'dismissed', address: string, map: Record<string, string>) {
  try {
    localStorage.setItem(storageKey(kind, address), JSON.stringify(map));
  } catch {
    // storage full/blocked — the entry will just come back
  }
}

function loadCachedClaimables(address: string): Claimable[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey('claimables', address)) || '[]');
    return (raw as { market: MarketMeta; amount: string }[]).map((c) => ({
      market: c.market,
      amount: BigInt(c.amount),
    }));
  } catch {
    return [];
  }
}

function saveCachedClaimables(address: string, claimables: Claimable[]) {
  try {
    localStorage.setItem(
      storageKey('claimables', address),
      JSON.stringify(claimables.map((c) => ({ market: c.market, amount: c.amount.toString() })))
    );
  } catch {
    // storage full/blocked — other pages will just show stale/empty
  }
}

function countUnseen(address: string, claimables: Claimable[]): number {
  const seen = loadMap('seen', address);
  return claimables.filter((c) => seen[c.market.ncId] !== c.amount.toString()).length;
}

/**
 * Claimable winnings for the connected address across all registered markets.
 *
 * A market owes the address money when it is resolved and the contract's
 * get_max_withdrawal view is positive — the view already subtracts prior
 * withdrawals, so claiming makes the item disappear on the next check.
 *
 * The sweep costs one node view call per market, so only the homepage runs
 * it (`active`), once per minute. Everywhere else the bell renders from the
 * cached result of the last sweep — no network traffic.
 */
export function useClaimables(address: string | null, active: boolean) {
  const [claimables, setClaimables] = useState<Claimable[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const checking = useRef(false);

  const check = useCallback(async () => {
    if (!address || checking.current) return;
    checking.current = true;
    try {
      const res = await fetch('/api/markets');
      if (!res.ok) return;
      const { markets } = await res.json();

      // One view call per market, all in parallel. get_max_withdrawal on an
      // unresolved market answers ResultNotAvailable, which maps to 0n — no
      // separate resolved check needed.
      const results = await Promise.all(
        ((markets as MarketMeta[]) ?? []).map(async (market) => {
          const amount = await getMaxWithdrawal(market.ncId, address).catch(() => 0n);
          return amount > 0n ? { market, amount } : null;
        })
      );
      const found = results.filter((c): c is Claimable => c !== null);

      const dismissed = loadMap('dismissed', address);
      const visible = found.filter((c) => dismissed[c.market.ncId] !== c.amount.toString());

      saveCachedClaimables(address, visible);
      setClaimables(visible);
      setUnseenCount(countUnseen(address, visible));
    } finally {
      checking.current = false;
    }
  }, [address]);

  // Restore the last sweep result for instant display (all pages).
  useEffect(() => {
    if (!address) {
      setClaimables([]);
      setUnseenCount(0);
      return;
    }
    const cached = loadCachedClaimables(address);
    setClaimables(cached);
    setUnseenCount(countUnseen(address, cached));
  }, [address]);

  // The sweep itself: homepage only, once per minute.
  useEffect(() => {
    if (!address || !active) return;
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [address, active, check]);

  /** Mark everything currently claimable as seen (clears the badge only). */
  const markSeen = useCallback(() => {
    if (!address) return;
    const seen = loadMap('seen', address);
    for (const c of claimables) {
      seen[c.market.ncId] = c.amount.toString();
    }
    saveMap('seen', address, seen);
    setUnseenCount(0);
  }, [address, claimables]);

  /** Clear one entry from the panel until it is claimed. */
  const dismiss = useCallback(
    (ncId: string) => {
      if (!address) return;
      const entry = claimables.find((c) => c.market.ncId === ncId);
      if (!entry) return;
      const dismissed = loadMap('dismissed', address);
      dismissed[ncId] = entry.amount.toString();
      saveMap('dismissed', address, dismissed);
      const remaining = claimables.filter((c) => c.market.ncId !== ncId);
      saveCachedClaimables(address, remaining);
      setClaimables(remaining);
    },
    [address, claimables]
  );

  /** Clear all entries from the panel until they are claimed. */
  const dismissAll = useCallback(() => {
    if (!address) return;
    const dismissed = loadMap('dismissed', address);
    for (const c of claimables) {
      dismissed[c.market.ncId] = c.amount.toString();
    }
    saveMap('dismissed', address, dismissed);
    saveCachedClaimables(address, []);
    setClaimables([]);
    setUnseenCount(0);
  }, [address, claimables]);

  return { claimables, unseenCount, markSeen, dismiss, dismissAll, refresh: check };
}
