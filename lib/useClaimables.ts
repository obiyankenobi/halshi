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
function storageKey(kind: 'seen' | 'dismissed', address: string): string {
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

/**
 * Claimable winnings for the connected address across all registered markets.
 *
 * A market owes the address money when it is resolved and the contract's
 * get_max_withdrawal view is positive — the view already subtracts prior
 * withdrawals, so claiming makes the item disappear on the next check.
 * Polls while the tab is open and re-checks on window focus.
 */
export function useClaimables(address: string | null) {
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

      setClaimables(visible);
      const seen = loadMap('seen', address);
      setUnseenCount(visible.filter((c) => seen[c.market.ncId] !== c.amount.toString()).length);
    } finally {
      checking.current = false;
    }
  }, [address]);

  // initial check + poll + focus refresh
  useEffect(() => {
    if (!address) {
      setClaimables([]);
      setUnseenCount(0);
      return;
    }
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [address, check]);

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
      setClaimables((prev) => prev.filter((c) => c.market.ncId !== ncId));
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
    setClaimables([]);
    setUnseenCount(0);
  }, [address, claimables]);

  return { claimables, unseenCount, markSeen, dismiss, dismissAll, refresh: check };
}
