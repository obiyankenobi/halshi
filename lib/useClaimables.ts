'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MarketMeta, getMaxWithdrawal } from './betContract';
import { config } from './config';

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

/** Is the market resolved? Light single-field query. */
async function isResolved(ncId: string): Promise<boolean> {
  const base = config.hathorNodeUrls[config.defaultNetwork];
  try {
    const res = await fetch(`${base}/nano_contract/state?id=${ncId}&fields[]=final_result`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.success && data.fields?.final_result?.value != null;
  } catch {
    return false;
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

      const found: Claimable[] = [];
      for (const market of (markets as MarketMeta[]) ?? []) {
        if (!(await isResolved(market.ncId))) continue;
        const amount = await getMaxWithdrawal(market.ncId, address).catch(() => 0n);
        if (amount > 0n) found.push({ market, amount });
      }

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
