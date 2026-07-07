'use client';

import Link from 'next/link';
import { MarketWithState } from '@/lib/useMarkets';
import { marketStatus, MarketStatus } from '@/lib/betContract';
import { formatTokenAmount } from '@/lib/utils';

const statusStyles: Record<MarketStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'text-accent border-accent/40' },
  closed: { label: 'Awaiting result', className: 'text-ember border-ember/40' },
  resolved: { label: 'Resolved', className: 'text-fog border-line' },
};

export function StatusBadge({ status }: { status: MarketStatus }) {
  const style = statusStyles[status];
  return (
    <span className={`microlabel px-2.5 py-1 rounded-full border ${style.className}`}>
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
      className="group flex flex-col bg-panel border border-line rounded-2xl p-5 hover:border-accent/50 hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-3 mb-5">
        <h3 className="text-snow font-semibold leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {meta.question}
        </h3>
        <StatusBadge status={status} />
      </div>

      <div className="space-y-2.5 mb-5 flex-1">
        {meta.outcomes.slice(0, 3).map((outcome) => {
          const pool = state?.outcomePools[outcome] ?? 0n;
          const percent = total > 0n ? Number((pool * 1000n) / total) / 10 : 0;
          const isWinner = state?.finalResult === outcome;
          return (
            <div key={outcome}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={`truncate ${isWinner ? 'text-accent font-semibold' : 'text-snow/80'}`}>
                  {outcome}
                  {isWinner && ' ✓'}
                </span>
                <span className="font-mono text-xs text-fog ml-2 shrink-0">{outcomePercent(pool, total)}</span>
              </div>
              <div className="h-1 bg-inset rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${isWinner ? 'bg-accent' : 'bg-fog/40'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
        {meta.outcomes.length > 3 && (
          <div className="microlabel text-fog/60">+{meta.outcomes.length - 3} more</div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line/60 pt-3">
        <span className="font-mono text-xs text-fog">{formatTokenAmount(total)} HTR</span>
        <span className="microlabel text-fog/70">
          {status === 'open'
            ? `closes ${new Date(meta.dateLastBet * 1000).toLocaleDateString()}`
            : status === 'closed'
              ? 'betting closed'
              : `→ ${state?.finalResult}`}
        </span>
      </div>
    </Link>
  );
}
