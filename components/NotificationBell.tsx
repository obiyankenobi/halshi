'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import { useClaimables } from '@/lib/useClaimables';
import { formatTokenAmount } from '@/lib/utils';

export default function NotificationBell() {
  const { address } = useWallet();
  const { claimables, unseenCount, markSeen, dismiss, dismissAll } = useClaimables(address);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // close on outside click / escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) markSeen();
  };

  if (!address) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        aria-label={unseenCount > 0 ? `${unseenCount} new rewards to claim` : 'Notifications'}
        className="relative w-10 h-10 flex items-center justify-center rounded-full border border-line bg-panel text-fog hover:text-snow hover:border-fog transition-colors"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-accent text-ink text-[10px] font-bold">
            {unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-panel border border-line rounded-2xl shadow-xl shadow-black/40 overflow-hidden z-20">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <p className="microlabel text-fog">rewards</p>
            {claimables.length > 0 && (
              <button
                onClick={dismissAll}
                className="microlabel text-fog/70 hover:text-snow transition-colors"
              >
                clear all
              </button>
            )}
          </div>
          {claimables.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-fog/60">Nothing to claim.</p>
          ) : (
            <ul className="divide-y divide-line/60">
              {claimables.map(({ market, amount }) => (
                <li key={market.ncId} className="relative">
                  <Link
                    href={`/market/${market.ncId}`}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 pr-10 hover:bg-inset/60 transition-colors"
                  >
                    <p className="text-sm text-snow leading-snug line-clamp-2">
                      You won{' '}
                      <span className="font-mono text-accent">{formatTokenAmount(amount)} HTR</span> on
                      &ldquo;{market.question}&rdquo;
                    </p>
                    <p className="microlabel text-fog/70 mt-1">click to claim →</p>
                  </Link>
                  <button
                    onClick={() => dismiss(market.ncId)}
                    aria-label="Clear notification"
                    title="Clear (does not withdraw)"
                    className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded text-fog/60 hover:text-snow transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
