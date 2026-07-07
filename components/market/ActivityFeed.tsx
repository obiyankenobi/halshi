'use client';

import { MarketChainState } from '@/lib/betContract';
import { formatAddress, formatTokenAmount } from '@/lib/utils';

function describe(item: MarketChainState['activity'][number]): string {
  switch (item.method) {
    case 'initialize':
      return 'created the market';
    case 'bet':
      return `bet ${item.amount !== undefined ? formatTokenAmount(item.amount) : '?'} HTR on "${item.outcome ?? '?'}"`;
    case 'set_result':
      return 'set the final result';
    case 'withdraw':
      return `withdrew ${item.amount !== undefined ? formatTokenAmount(item.amount) : '?'} HTR`;
    default:
      return item.method;
  }
}

export default function ActivityFeed({ state }: { state: MarketChainState }) {
  if (state.activity.length === 0) {
    return <p className="text-sm text-fog/60">No activity yet.</p>;
  }

  return (
    <ul className="divide-y divide-line/60">
      {state.activity.map((item) => (
        <li key={item.txId} className="py-3 flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className="font-mono text-xs text-accent/80">{formatAddress(item.caller)}</span>{' '}
            <span className={item.voided ? 'text-fog/50 line-through' : 'text-fog'}>
              {describe(item)}
            </span>
            {!item.confirmed && !item.voided && (
              <span className="microlabel ml-2 text-ember">pending</span>
            )}
          </div>
          <span className="font-mono text-[11px] text-fog/50 shrink-0">
            {new Date(item.timestamp * 1000).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
