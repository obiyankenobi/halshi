'use client';

import Link from 'next/link';
import { MarketWithState } from '@/lib/useMarkets';
import { marketStatus, MarketStatus } from '@/lib/betContract';
import { formatTokenAmount } from '@/lib/utils';

const statusStyles: Record<MarketStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-green-500/10 text-green-400 border-green-500/30' },
  closed: { label: 'Awaiting result', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  resolved: { label: 'Resolved', className: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
};

export function StatusBadge({ status }: { status: MarketStatus }) {
  const style = statusStyles[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${style.className}`}>
      {style.label}
    </span>
  );
}

export function outcomePercent(pool: bigint, total: bigint): string {
  if (total === 0n) return '—';
  return `${Number((pool * 1000n) / total) / 10}%`;
}

export default function MarketCard({ market }: { market: MarketWithState }) {
  const { meta, state } = market;
  const status = state ? marketStatus(state) : 'open';
  const total = state?.total ?? 0n;

  return (
    <Link
      href={`/market/${meta.ncId}`}
      className="block bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-slate-500 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-white font-semibold leading-snug line-clamp-2">{meta.question}</h3>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-2 mb-4">
        {meta.outcomes.slice(0, 3).map((outcome) => {
          const pool = state?.outcomePools[outcome] ?? 0n;
          const isWinner = state?.finalResult === outcome;
          return (
            <div key={outcome} className="flex items-center justify-between text-sm">
              <span className={`truncate ${isWinner ? 'text-blue-400 font-semibold' : 'text-slate-300'}`}>
                {outcome}
                {isWinner && ' ✓'}
              </span>
              <span className="text-slate-400 font-mono ml-2 shrink-0">{outcomePercent(pool, total)}</span>
            </div>
          );
        })}
        {meta.outcomes.length > 3 && (
          <div className="text-xs text-slate-500">+{meta.outcomes.length - 3} more outcomes</div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/60 pt-3">
        <span>{formatTokenAmount(total)} HTR pool</span>
        <span>
          {status === 'open'
            ? `Closes ${new Date(meta.dateLastBet * 1000).toLocaleDateString()}`
            : status === 'closed'
              ? 'Betting closed'
              : `Result: ${state?.finalResult}`}
        </span>
      </div>
    </Link>
  );
}
