'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketMeta, getMaxWithdrawal } from './betContract';

export interface Claimable {
  market: MarketMeta;
  amount: bigint; // cents still withdrawable
}

const POLL_INTERVAL_MS = 60_000;

function seenKey(address: string): string {
  return `halshi_seen_rewards:${address}`;
}

function loadSeen(address: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(seenKey(address)) || '{}');
  } catch {
    return {};
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

      setClaimables(found);
      const seen = loadSeen(address);
      setUnseenCount(found.filter((c) => seen[c.market.ncId] !== c.amount.toString()).length);
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

  /** Mark everything currently claimable as seen (clears the badge). */
  const markSeen = useCallback(() => {
    if (!address) return;
    const seen = loadSeen(address);
    for (const c of claimables) {
      seen[c.market.ncId] = c.amount.toString();
    }
    try {
      localStorage.setItem(seenKey(address), JSON.stringify(seen));
    } catch {
      // storage full/blocked — badge will just reappear
    }
    setUnseenCount(0);
  }, [address, claimables]);

  return { claimables, unseenCount, markSeen, refresh: check };
}
